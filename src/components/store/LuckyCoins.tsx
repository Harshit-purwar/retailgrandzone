import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  categoryEligibleForCoins,
  claimCoinReward,
  expireOldCoins,
  useActiveCampaign,
  useCoinRewards,
  useCoinWallet,
} from "@/lib/lucky-coins";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { orderState, orderStateLabel } from "@/lib/order-status";
import { inr, type Order } from "@/lib/store-types";

export function LuckyCoinsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: campaign } = useActiveCampaign();
  const { data: wallet, refetch: refetchWallet } = useCoinWallet(user?.id);
  const { data: rewards } = useCoinRewards(user?.id);
  const [message, setMessage] = useState<string | null>(null);
  const [claimingOrder, setClaimingOrder] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["coin-claim-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  if (!campaign) return null;

  const eligible = Array.isArray(campaign.eligible_categories) ? campaign.eligible_categories : [];
  const shownRewards = rewards?.filter((r) => r.status !== "expired") ?? [];
  const activeCount = shownRewards.filter((r) => r.status === "active").length;
  const claimedOrderIds = new Set((rewards ?? []).map((r) => r.order_id));

  const claimable = (orders ?? []).filter((o) => {
    const state = orderState(o);
    return (state === "successful" || state === "pending") && !claimedOrderIds.has(o.id);
  });

  async function handleClaim(orderId: string) {
    setClaimingOrder(orderId);
    setMessage(null);
    try {
      const res = await claimCoinReward(orderId);
      if (res.already_claimed) {
        setMessage(`You already claimed ₹${res.amount} for this order.`);
      } else {
        setMessage(
          `Lucky draw! You won ₹${res.amount} Coins. Valid until ${new Date(res.expires_at).toLocaleDateString()}.`,
        );
      }
      await refetchWallet();
      await queryClient.invalidateQueries({ queryKey: ["coin-rewards"] });
      await queryClient.invalidateQueries({ queryKey: ["coin-claim-orders"] });
    } catch (e) {
      setMessage((e as Error).message || "Could not claim Coins.");
    } finally {
      setClaimingOrder(null);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-lg">
            🪙
          </span>
          <div>
            <p className="font-semibold text-amber-900">Grand Zone Wallet Coin</p>
            <p className="text-xs text-amber-700">
              {campaign.name} · Earn up to ₹{campaign.max_per_customer} Coins
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-700">₹{wallet?.balance ?? 0}</p>
          <p className="text-xs text-amber-700">Grand Zone Wallet balance</p>
        </div>
      </div>

      {claimable.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-2 text-xs text-amber-800">
          <p className="mb-1 font-medium">Claim Coins on an order</p>
          <ul className="space-y-1">
            {claimable.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  Order {o.id.slice(0, 8).toUpperCase()} · {inr(Number(o.total))} ·{" "}
                  {orderStateLabel(orderState(o))}
                </span>
                <button
                  type="button"
                  onClick={() => handleClaim(o.id)}
                  disabled={claimingOrder === o.id}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {claimingOrder === o.id ? "Drawing..." : "Claim"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeCount > 0 && (
        <div className="mt-3 rounded-lg bg-white p-2 text-xs text-amber-800">
          <p className="mb-1 font-medium">Your reward Coins</p>
          <ul className="space-y-1">
            {shownRewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>
                  ₹{r.amount} · {new Date(r.expires_at).toLocaleDateString()}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    r.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {r.status === "active" ? "active" : "used"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {eligible.length > 0 && (
        <p className="mt-3 text-xs text-amber-700">Use Coins on: {eligible.join(", ")}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Link
          to="/orders"
          className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          View all orders
        </Link>
        <button
          onClick={() => {
            expireOldCoins().then(() => {
              queryClient.invalidateQueries({ queryKey: ["coin-wallet"] });
              queryClient.invalidateQueries({ queryKey: ["coin-rewards"] });
            });
            setMessage(null);
          }}
          className="rounded-xl border border-amber-300 px-3 py-2 text-sm text-amber-800 hover:bg-amber-100"
        >
          Refresh
        </button>
      </div>

      {message && <p className="mt-2 text-sm text-amber-900">{message}</p>}
    </div>
  );
}

export function OrderLuckyCoins({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: campaign } = useActiveCampaign();
  const { data: wallet, refetch: refetchWallet } = useCoinWallet(user?.id);
  const { data: rewards } = useCoinRewards(user?.id);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!campaign || !user) return null;

  const alreadyClaimed = (rewards ?? []).find((r) => r.order_id === orderId);

  async function handleClaim() {
    setClaiming(true);
    setMessage(null);
    try {
      const res = await claimCoinReward(orderId);
      if (res.already_claimed) {
        setMessage(`You already claimed ₹${res.amount} for this order.`);
      } else {
        setMessage(
          `Lucky draw! You won ₹${res.amount} Coins. Valid until ${new Date(res.expires_at).toLocaleDateString()}.`,
        );
      }
      await refetchWallet();
      await queryClient.invalidateQueries({ queryKey: ["coin-rewards"] });
    } catch (e) {
      setMessage((e as Error).message || "Could not claim Coins.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-lg">
            🪙
          </span>
          <div>
            <p className="font-semibold text-amber-900">{campaign.name}</p>
            <p className="text-xs text-amber-700">Wallet balance: ₹{wallet?.balance ?? 0}</p>
          </div>
        </div>
        {alreadyClaimed ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Coins claimed
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {claiming ? "Drawing..." : "Claim Lucky Coins"}
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-amber-900">{message}</p>}
    </div>
  );
}

export function LuckyCoinsPromo({ category }: { category?: string }) {
  const { data: campaign } = useActiveCampaign();
  if (!campaign) return null;
  const ok = categoryEligibleForCoins(campaign, category);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        ok
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      <span className="text-lg">🪙</span>
      <span>
        {ok
          ? `Earn up to ₹${campaign.max_per_customer} Lucky Coins on this item.`
          : "This item is not eligible for Lucky Coins."}
      </span>
    </div>
  );
}

export function LuckyCoinsHomeBanner() {
  const { data: campaign } = useActiveCampaign();
  if (!campaign) return null;
  const eligible = Array.isArray(campaign.eligible_categories)
    ? campaign.eligible_categories
    : [];
  return (
    <Link
      to="/orders"
      className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-50 p-4 shadow-sm transition hover:border-amber-400 sm:mt-5"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400 text-2xl shadow-inner">
        🪙
      </span>
      <div className="flex-1">
        <p className="font-bold text-amber-900">Grand Zone Wallet Coin</p>
        <p className="text-xs text-amber-700 sm:text-sm">
          Order now to win {campaign.name} worth up to ₹{campaign.max_per_customer} — use them on
          your next purchase.
        </p>
        {eligible.length > 0 ? (
          <p className="mt-0.5 text-[11px] font-medium text-amber-700">
            Eligible: {eligible.join(", ")}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white">
        Explore
      </span>
    </Link>
  );
}
