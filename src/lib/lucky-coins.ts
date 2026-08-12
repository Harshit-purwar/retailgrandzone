import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CoinCampaign = Database["public"]["Tables"]["coin_campaigns"]["Row"];
export type CoinReward = Database["public"]["Tables"]["coin_rewards"]["Row"];
export type CoinWallet = Database["public"]["Tables"]["coin_wallet"]["Row"];

export function useActiveCampaign() {
  return useQuery({
    queryKey: ["coin-campaign"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_campaigns")
        .select("*")
        .eq("active", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoinCampaign | null;
    },
    staleTime: 60_000,
  });
}

export function useCoinWallet(userId: string | undefined) {
  return useQuery({
    queryKey: ["coin-wallet", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_wallet")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoinWallet | null;
    },
    staleTime: 15_000,
  });
}

export function useCoinRewards(userId: string | undefined) {
  return useQuery({
    queryKey: ["coin-rewards", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_rewards")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as CoinReward[];
    },
    staleTime: 15_000,
  });
}

export async function claimCoinReward(
  orderId: string,
): Promise<{
  amount: number;
  expires_at: string;
  already_claimed: boolean;
  better_luck?: boolean;
  message?: string;
}> {
  const { data, error } = await supabase.rpc("claim_lucky_coin", {
    p_order_id: orderId,
  });
  if (error) throw error;
  const parsed = (data ?? {}) as {
    amount?: number;
    expires_at?: string;
    already_claimed?: boolean;
    better_luck?: boolean;
    message?: string;
  };
  return {
    amount: Number(parsed.amount ?? 0),
    expires_at: parsed.expires_at ?? "",
    already_claimed: Boolean(parsed.already_claimed),
    better_luck: Boolean(parsed.better_luck),
    message: parsed.message ?? "",
  };
}

export async function redeemCoins(orderId: string, amount: number): Promise<{ used: number }> {
  const { data, error } = await supabase.rpc("redeem_coins", {
    p_order_id: orderId,
    p_amount: amount,
  });
  if (error) throw error;
  const parsed = (data ?? {}) as { used?: number };
  return { used: Number(parsed.used ?? 0) };
}

export async function expireOldCoins(): Promise<void> {
  await supabase.rpc("expire_old_coins");
}

export function categoryEligibleForCoins(
  campaign: Pick<CoinCampaign, "eligible_categories"> | null,
  category: string | null | undefined,
): boolean {
  if (!campaign) return false;
  const eligible = campaign.eligible_categories;
  if (!Array.isArray(eligible) || eligible.length === 0) return true;
  if (!category) return false;
  return eligible.some((c) => String(c).toLowerCase() === category.toLowerCase());
}
