-- =====================================================================
-- Lucky Coins / Grand Wallet + Customer Reviews
-- Run this in the Supabase SQL Editor (idempotent, safe to re-run).
-- =====================================================================

-- =====================================================================
-- CUSTOMER REVIEWS
--   * Only customers who purchased AND received a product can review it.
--   * 1–5 stars, text, image + video.
--   * "Verified Purchase" badge is computed server-side.
--   * One review per user per product (no duplicates / no fake reviews).
--   * Admins can moderate (hide / delete) and view everything.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_email text NOT NULL DEFAULT '',
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'hidden')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;
CREATE POLICY "reviews public read approved" ON public.reviews FOR SELECT
  USING (status = 'approved' OR public.is_admin());

DROP POLICY IF EXISTS "reviews own insert" ON public.reviews;
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews own update" ON public.reviews;
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews own delete" ON public.reviews;
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews admin all" ON public.reviews;
CREATE POLICY "reviews admin all" ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_user_product ON public.reviews(user_id, product_id);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-enforced review submission.
CREATE OR REPLACE FUNCTION public.submit_review(
  p_product_id uuid,
  p_rating smallint,
  p_title text DEFAULT '',
  p_comment text DEFAULT '',
  p_images jsonb DEFAULT '[]'::jsonb,
  p_video_url text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_order_id uuid;
  v_review public.reviews%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please log in to write a review.';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- One review per user per product (no duplicates / no fake reviews).
  IF EXISTS (
    SELECT 1 FROM public.reviews WHERE user_id = v_user_id AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this product.';
  END IF;

  -- Must have purchased the product AND received it (a delivered order).
  -- Combo lines are matched through their stored product snapshot too.
  SELECT oi.order_id INTO v_order_id
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.user_id = v_user_id
    AND lower(o.status) = 'delivered'
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.user_id = v_user_id AND r.product_id = p_product_id
    )
    AND (
      oi.product_id = p_product_id
      OR oi.combo_items @> jsonb_build_array(jsonb_build_object('id', p_product_id::text))
    )
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Reviews are available only after the product has been delivered to you.';
  END IF;

  BEGIN
    INSERT INTO public.reviews
      (product_id, user_id, order_id, user_email, rating, title, comment, images, video_url, verified, status)
    VALUES
      (p_product_id, v_user_id, v_order_id, coalesce(v_user_email, ''),
       p_rating, coalesce(p_title, ''), coalesce(p_comment, ''),
       coalesce(p_images, '[]'::jsonb), coalesce(p_video_url, ''), true, 'approved')
    RETURNING * INTO v_review;

    RETURN jsonb_build_object(
      'id', v_review.id,
      'rating', v_review.rating,
      'verified', v_review.verified,
      'status', v_review.status
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already reviewed this product.';
  END;
END;
$$;

-- =====================================================================
-- LUCKY COINS / GRAND WALLET
--   * Rewards of ₹2 / ₹3 / ₹5 / ₹10 Coins, single reward max ₹10.
--   * Each reward expires individually after the campaign's validity days.
--   * A customer can earn at most `max_per_customer` Coins per campaign.
--   * Backend (RPC) enforces: eligibility categories, per-campaign cap,
--     one claim per order (no refresh / repeated-click abuse).
--   * Coins can ONLY be spent on the campaign's eligible categories.
--   * No cash withdrawal, no real-money debit — a wallet discount only.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coin_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  reward_amounts jsonb NOT NULL DEFAULT '[2,3,5,10]'::jsonb,
  max_per_customer numeric NOT NULL DEFAULT 50 CHECK (max_per_customer > 0),
  expires_days integer NOT NULL DEFAULT 7 CHECK (expires_days > 0),
  eligible_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coin_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_campaigns TO authenticated;
GRANT ALL ON public.coin_campaigns TO service_role;

ALTER TABLE public.coin_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns public read" ON public.coin_campaigns;
CREATE POLICY "campaigns public read" ON public.coin_campaigns FOR SELECT
  USING (active OR public.is_admin());

DROP POLICY IF EXISTS "campaigns admin write" ON public.coin_campaigns;
CREATE POLICY "campaigns admin write" ON public.coin_campaigns FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_coin_campaigns_updated_at ON public.coin_campaigns;
CREATE TRIGGER update_coin_campaigns_updated_at BEFORE UPDATE ON public.coin_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.coin_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.coin_campaigns(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_email text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at timestamptz NOT NULL,
  used_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.coin_rewards TO authenticated;
GRANT ALL ON public.coin_rewards TO service_role;

ALTER TABLE public.coin_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewards own read" ON public.coin_rewards;
CREATE POLICY "rewards own read" ON public.coin_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "rewards own insert" ON public.coin_rewards;
CREATE POLICY "rewards own insert" ON public.coin_rewards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rewards admin all" ON public.coin_rewards;
CREATE POLICY "rewards admin all" ON public.coin_rewards FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS coin_rewards_user_idx ON public.coin_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS coin_rewards_campaign_idx ON public.coin_rewards(campaign_id);

-- One claim per order — the atomic guard against refresh / double-click abuse.
CREATE UNIQUE INDEX IF NOT EXISTS coin_rewards_one_per_order
  ON public.coin_rewards(order_id) WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.coin_wallet (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coin_wallet TO authenticated;
GRANT ALL ON public.coin_wallet TO service_role;

ALTER TABLE public.coin_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet own read" ON public.coin_wallet;
CREATE POLICY "wallet own read" ON public.coin_wallet FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet own update" ON public.coin_wallet;
CREATE POLICY "wallet own update" ON public.coin_wallet FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet own insert" ON public.coin_wallet;
CREATE POLICY "wallet own insert" ON public.coin_wallet FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Marks rewards past their individual expiry as "expired" and removes them
-- from the wallet balance. Safe to call at any time.
CREATE OR REPLACE FUNCTION public.expire_old_coins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_expired numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'login required';
  END IF;

  SELECT coalesce(sum(amount), 0) INTO v_expired
  FROM public.coin_rewards
  WHERE user_id = v_user_id AND status = 'active' AND expires_at <= now();

  IF v_expired > 0 THEN
    UPDATE public.coin_rewards SET status = 'expired'
    WHERE user_id = v_user_id AND status = 'active' AND expires_at <= now();
    UPDATE public.coin_wallet
    SET balance = GREATEST(0, balance - v_expired), updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

-- Claims a single Lucky Coin reward for an order. Everything is validated and
-- enforced in the database: active campaign, order ownership, category
-- eligibility, per-campaign cap and the one-claim-per-order guard.
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
  v_item record;
  v_entry jsonb;
  v_cat text;
  v_eligible boolean := false;
  v_claimed numeric;
  v_amount numeric;
  v_expires timestamptz;
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

  -- The unique index on coin_rewards.order_id is the hard guard against
  -- double claims; the check below just gives a friendly answer first.
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

  -- Order must include a product from the campaign's eligible categories.
  IF v_campaign.eligible_categories IS NOT NULL
     AND jsonb_typeof(v_campaign.eligible_categories) = 'array'
     AND jsonb_array_length(v_campaign.eligible_categories) > 0 THEN
    FOR v_item IN
      SELECT oi.product_id, oi.combo_items, p.category
      FROM public.order_items oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
    LOOP
      IF v_item.category IS NOT NULL
         AND v_campaign.eligible_categories @> jsonb_build_array(v_item.category) THEN
        v_eligible := true;
        EXIT;
      END IF;
      IF v_item.combo_items IS NOT NULL
         AND jsonb_typeof(v_item.combo_items) = 'array'
         AND jsonb_array_length(v_item.combo_items) > 0 THEN
        FOR v_entry IN SELECT e FROM jsonb_array_elements(v_item.combo_items) AS e LOOP
          SELECT category INTO v_cat FROM public.products WHERE id = (v_entry->>'id')::uuid;
          IF v_cat IS NOT NULL
             AND v_campaign.eligible_categories @> jsonb_build_array(v_cat) THEN
            v_eligible := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      IF v_eligible THEN EXIT; END IF;
    END LOOP;
    IF NOT v_eligible THEN
      RAISE EXCEPTION 'Your order does not include a category that is eligible for Lucky Coins.';
    END IF;
  END IF;

  -- Per-campaign earning cap.
  SELECT coalesce(sum(amount), 0) INTO v_claimed
  FROM public.coin_rewards
  WHERE user_id = v_user_id AND campaign_id = v_campaign.id;

  IF v_claimed >= v_campaign.max_per_customer THEN
    RAISE EXCEPTION 'You have reached the maximum Lucky Coins for this campaign.';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Random reward from the configured amounts (2 / 3 / 5 / 10), never more
  -- than what is left of the per-customer cap, and never more than 10.
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
      'already_claimed', false
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

-- Redeems wallet Coins against an order. Only rewards whose campaign allows
-- one of the order's product categories are spent (FIFO by expiry). Returns
-- the exact amount actually applied so the client can reconcile the total.
CREATE OR REPLACE FUNCTION public.redeem_coins(p_order_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance numeric;
  v_used numeric := 0;
  v_reward record;
  v_cat text;
  v_entry text;
  v_order_categories text[] := '{}'::text[];
  v_order_total numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please log in to use your Coins.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('used', 0);
  END IF;

  SELECT total INTO v_order_total FROM public.orders WHERE id = p_order_id AND user_id = v_user_id;
  IF v_order_total IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- Lock the wallet so concurrent redemptions stay consistent.
  SELECT balance INTO v_balance
  FROM public.coin_wallet
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('used', 0);
  END IF;
  p_amount := least(p_amount, v_balance, GREATEST(v_order_total, 0));

  -- Categories present in this order (product lines + combo snapshots).
  FOR v_cat IN
    SELECT DISTINCT p.category::text
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
  LOOP
    IF v_cat IS NOT NULL THEN
      v_order_categories := v_order_categories || v_cat;
    END IF;
  END LOOP;

  FOR v_entry IN
    SELECT DISTINCT (e->>'id')::text AS pid
    FROM public.order_items oi
    CROSS JOIN LATERAL jsonb_array_elements(oi.combo_items) e
    WHERE oi.order_id = p_order_id
      AND jsonb_typeof(oi.combo_items) = 'array'
      AND jsonb_array_length(oi.combo_items) > 0
  LOOP
    SELECT category INTO v_cat FROM public.products WHERE id = v_entry::uuid;
    IF v_cat IS NOT NULL THEN
      v_order_categories := v_order_categories || v_cat;
    END IF;
  END LOOP;

  FOR v_reward IN
    SELECT r.id, r.amount, r.campaign_id, c.eligible_categories
    FROM public.coin_rewards r
    JOIN public.coin_campaigns c ON c.id = r.campaign_id
    WHERE r.user_id = v_user_id
      AND r.status = 'active'
      AND r.expires_at > now()
      AND (
        c.eligible_categories IS NULL
        OR jsonb_typeof(c.eligible_categories) <> 'array'
        OR jsonb_array_length(c.eligible_categories) = 0
        OR EXISTS (
          SELECT 1 FROM unnest(v_order_categories) cat
          WHERE c.eligible_categories @> jsonb_build_array(cat)
        )
      )
    ORDER BY r.expires_at ASC, r.created_at ASC
  LOOP
    IF v_used >= p_amount THEN EXIT; END IF;
    UPDATE public.coin_rewards
    SET status = 'used', used_order_id = p_order_id, used_at = now()
    WHERE id = v_reward.id;
    v_used := v_used + v_reward.amount;
  END LOOP;

  IF v_used > 0 THEN
    UPDATE public.coin_wallet
    SET balance = GREATEST(0, balance - v_used), updated_at = now()
    WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object('used', v_used);
END;
$$;

-- Orders remember how many Coins were applied (for display on the invoice).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coins_applied numeric NOT NULL DEFAULT 0;

-- Returns Coins back to the wallet when a paid order is cancelled / refunded.
CREATE OR REPLACE FUNCTION public.refund_coins_for_order(p_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_used numeric;
BEGIN
  SELECT coalesce(sum(amount), 0) INTO v_used
  FROM public.coin_rewards
  WHERE used_order_id = p_order_id AND status = 'used'
    AND user_id = v_user_id;

  IF v_used > 0 THEN
    UPDATE public.coin_rewards
    SET status = 'active', used_order_id = NULL, used_at = NULL
    WHERE used_order_id = p_order_id AND status = 'used'
      AND user_id = v_user_id;
    UPDATE public.coin_wallet
    SET balance = balance + v_used, updated_at = now()
    WHERE user_id = v_user_id;
  END IF;

  RETURN v_used;
END;
$$;

-- Releases a pending redemption when a payment fails: the Coins are returned
-- to the wallet and the order's coin discount is cleared.
CREATE OR REPLACE FUNCTION public.release_coins_for_pending_order(p_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_used numeric;
  v_new_total numeric;
BEGIN
  SELECT coins_applied INTO v_used FROM public.orders WHERE id = p_order_id AND user_id = v_user_id;
  v_used := coalesce(v_used, 0);

  IF v_used > 0 THEN
    UPDATE public.coin_rewards
    SET status = 'active', used_order_id = NULL, used_at = NULL
    WHERE used_order_id = p_order_id AND status = 'used'
      AND user_id = v_user_id;
    UPDATE public.coin_wallet
    SET balance = balance + v_used, updated_at = now()
    WHERE user_id = v_user_id;
    SELECT total + v_used INTO v_new_total
    FROM public.orders WHERE id = p_order_id AND user_id = v_user_id;
    UPDATE public.orders
    SET total = GREATEST(0, v_new_total), coins_applied = 0
    WHERE id = p_order_id AND user_id = v_user_id;
  END IF;

  RETURN v_used;
END;
$$;
