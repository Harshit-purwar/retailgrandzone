-- =====================================================================
-- FIX: Lucky Coins weekly rules.
--   * Every checkout earns Coins (any category — no category gate).
--   * One claim per order (unchanged, abuse guard).
--   * At most `max_per_customer` (50) Coins per rolling 7 days.
--   * When the weekly cap is reached, the RPC returns a friendly
--     "Better luck next time" message instead of an error.
--   * Each reward still expires after the campaign's `expires_days` (7).
-- Run this in the Supabase SQL Editor. Idempotent and safe to re-run.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_lucky_coin(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_campaign record;
  v_amount numeric;
  v_expires timestamptz;
  v_claimed numeric;
  v_reward public.coin_rewards%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please log in to claim Lucky Coins.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.user_id = v_user_id
      AND (lower(o.payment_method) IN ('cod', 'cash on delivery') OR lower(o.payment_status) = 'paid')
      AND lower(o.status) NOT IN ('payment failed', 'cancelled', 'cancelled by customer')
  ) THEN
    RAISE EXCEPTION 'This order is not eligible for Lucky Coins.';
  END IF;

  -- One claim per order — the unique index on coin_rewards.order_id is the
  -- hard guard against double claims; this check gives a friendly answer first.
  SELECT amount INTO v_claimed
  FROM public.coin_rewards
  WHERE order_id = p_order_id AND user_id = v_user_id
  LIMIT 1;
  IF v_claimed IS NOT NULL THEN
    RETURN jsonb_build_object('already_claimed', true, 'amount', v_claimed);
  END IF;

  -- Lock the campaign row so concurrent claims are serialised (cap guard).
  SELECT * INTO v_campaign
  FROM public.coin_campaigns
  WHERE active = true AND starts_at <= now() AND now() <= ends_at
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'No Lucky Coins campaign is active right now.';
  END IF;

  -- Weekly rolling cap: at most max_per_customer (50) Coins per 7 days.
  SELECT coalesce(sum(amount), 0) INTO v_claimed
  FROM public.coin_rewards
  WHERE user_id = v_user_id
    AND status IN ('active', 'used')
    AND created_at >= now() - interval '7 days';

  IF v_claimed >= v_campaign.max_per_customer THEN
    RETURN jsonb_build_object(
      'better_luck', true,
      'amount', 0,
      'message', 'Better luck next time! You have already earned the maximum Coins for this week.'
    );
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Random reward from the configured amounts (2 / 3 / 5 / 10), never more
  -- than what is left of the weekly cap, and never more than 10.
  SELECT (v_campaign.reward_amounts)[floor(random() * jsonb_array_length(v_campaign.reward_amounts))::int + 1]::numeric
  INTO v_amount;

  v_amount := least(v_amount, v_campaign.max_per_customer - v_claimed, 10);
  v_expires := now() + make_interval(days => v_campaign.expires_days);

  BEGIN
    INSERT INTO public.coin_rewards
      (user_id, campaign_id, order_id, user_email, amount, status, expires_at)
    VALUES
      (v_user_id, v_campaign.id, p_order_id, coalesce(v_user_email, ''), v_amount, 'active', v_expires)
    RETURNING * INTO v_reward;

    -- Add to the Grand Wallet.
    INSERT INTO public.coin_wallet (user_id, balance)
    VALUES (v_user_id, v_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = coin_wallet.balance + v_amount, updated_at = now();

    RETURN jsonb_build_object(
      'amount', v_reward.amount,
      'expires_at', v_reward.expires_at,
      'already_claimed', false,
      'better_luck', false,
      'message', format(
        'Lucky draw! You won ₹%s Coins. Valid until %s.',
        v_reward.amount,
        to_char(v_reward.expires_at, 'YYYY-MM-DD')
      )
    );
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent request claimed this order first.
    SELECT amount INTO v_claimed
    FROM public.coin_rewards
    WHERE order_id = p_order_id AND user_id = v_user_id;
    RETURN jsonb_build_object('already_claimed', true, 'amount', v_claimed);
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
