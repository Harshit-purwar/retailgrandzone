import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Headphones,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useActiveCampaign, useCoinWallet } from "@/lib/lucky-coins";
import { cn } from "@/lib/utils";
import { LuckyCoinsPanel } from "@/components/store/LuckyCoins";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — The Grand Zone" },
      {
        name: "description",
        content: "Manage your Grand Zone account, orders, wishlist and Grand Zone Wallet Coins.",
      },
      { property: "og:title", content: "My Account — The Grand Zone" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [walletOpen, setWalletOpen] = useState(false);
  const { data: wallet } = useCoinWallet(user?.id);
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as { full_name: string | null } | null;
    },
  });

  useEffect(() => {
    if (!loading && !user)
      navigate({ to: "/auth", search: { redirect: "/account" }, replace: true });
  }, [loading, user, navigate]);

  if (!user) return null;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    profile?.full_name ||
    user.email?.split("@")[0] ||
    "User";
  const initial = name.charAt(0).toUpperCase();

  const rows = [
    {
      to: "/orders",
      label: "My Orders",
      sub: "Track, return or claim Coins on orders",
      icon: <Package className="h-5 w-5" />,
      iconBg: "bg-sky-100 text-sky-600",
    },
    {
      to: "/wishlist",
      label: "Wishlist",
      sub: "Items you saved for later",
      icon: <Heart className="h-5 w-5" />,
      iconBg: "bg-rose-100 text-rose-500",
    },
    {
      to: "/combos",
      label: "Combos",
      sub: "Curated bundle offers",
      icon: <Sparkles className="h-5 w-5" />,
      iconBg: "bg-violet-100 text-violet-600",
    },
    {
      to: "/help",
      label: "Help & Support",
      sub: "FAQs, contact and support requests",
      icon: <Headphones className="h-5 w-5" />,
      iconBg: "bg-emerald-100 text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <h1 className="mb-3 text-xl font-bold sm:text-2xl">My Account</h1>

      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--brand)] to-[var(--deal)] p-4 text-brand-foreground shadow-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/25 text-xl font-bold">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{name}</p>
          <p className="truncate text-sm opacity-80">{user.email}</p>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setWalletOpen((v) => !v)}
          aria-expanded={walletOpen}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-50 p-4 text-left shadow-sm transition hover:border-amber-400"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
            <Coins className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-bold text-amber-900">Grand Zone Wallet Coin</span>
            <span className="block text-xs text-amber-700">
              Tap to see your Coins, claims and rewards
            </span>
          </span>
          <span className="text-right">
            <span className="block text-xl font-bold text-amber-700">₹{wallet?.balance ?? 0}</span>
            <span className="block text-[11px] text-amber-700">balance</span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-amber-700 transition-transform",
              walletOpen && "rotate-180",
            )}
          />
        </button>
        {walletOpen ? (
          <div className="mt-2">
            <LuckyCoinsPanel />
          </div>
        ) : null}
      </div>

      <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {rows.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="flex items-center gap-3 p-3.5 transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                r.iconBg,
              )}
            >
              {r.icon}
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{r.label}</span>
              <span className="block text-xs text-muted-foreground">{r.sub}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        {isAdmin ? (
          <Link
            to="/admin"
            className="flex items-center gap-3 p-3.5 transition-colors hover:bg-accent"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Admin panel</span>
              <span className="block text-xs text-muted-foreground">
                Manage products, orders and store
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <LogOut className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Log out</span>
            <span className="block text-xs text-muted-foreground">Sign out of your account</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
