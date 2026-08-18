import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, ShoppingBag, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import type { Order, OrderItem } from "@/lib/store-types";
import { CANCELLED_BY_CUSTOMER, canCustomerCancel, inr, toComboItems } from "@/lib/store-types";
import { orderState } from "@/lib/order-status";
import { storeImageUrl } from "@/lib/store-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LuckyCoinsPanel } from "@/components/store/LuckyCoins";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My orders — The Grand Zone" },
      {
        name: "description",
        content: "See all the orders you have placed on The Grand Zone and their current status.",
      },
      { property: "og:title", content: "My orders — The Grand Zone" },
      {
        property: "og:description",
        content: "See all the orders you have placed on The Grand Zone.",
      },
    ],
  }),
  component: OrdersPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function statusText(o: Order): string {
  const state = orderState(o);
  if (state === "cancelled") return "Cancelled";
  if (/delivered/i.test(o.status ?? "")) return "Delivered";
  if (state === "failed") return "Order failed";
  if (state === "pending") return "Payment pending";
  return o.status ?? "Ordered";
}

function statusClass(o: Order): string {
  const state = orderState(o);
  if (state === "cancelled" || state === "failed") return "text-red-600";
  if (/delivered/i.test(o.status ?? "")) return "text-emerald-600";
  if (state === "pending") return "text-amber-600";
  return "text-primary";
}

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cart = useCart();
  const [filter, setFilter] = useState<FilterId>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user)
      navigate({ to: "/auth", search: { redirect: "/orders" }, replace: true });
  }, [loading, user, navigate]);

  const ordersQuery = useQuery({
    enabled: !!user,
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const itemsQuery = useQuery({
    enabled: orders.length > 0,
    queryKey: ["orders-items", user?.id, orders.length],
    queryFn: async () => {
      const ids = orders.map((o) => o.id);
      const all: OrderItem[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { data, error } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", chunk);
        if (error) throw error;
        all.push(...((data ?? []) as unknown as OrderItem[]));
      }
      return all;
    },
  });

  const itemsByOrder = useMemo(() => {
    const m = new Map<string, OrderItem[]>();
    for (const it of itemsQuery.data ?? []) {
      const arr = m.get(it.order_id) ?? [];
      arr.push(it);
      m.set(it.order_id, arr);
    }
    return m;
  }, [itemsQuery.data]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter === "active") return !/delivered|cancelled/i.test(o.status ?? "");
      if (filter === "delivered") return /delivered/i.test(o.status ?? "");
      if (filter === "cancelled") return /cancelled/i.test(o.status ?? "");
      return true;
    });
  }, [orders, filter]);

  async function cancelOrder(order: Order) {
    if (!window.confirm(`Cancel order ${order.id.slice(0, 8).toUpperCase()}?`)) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: CANCELLED_BY_CUSTOMER, cancelled_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Order cancelled");
    qc.invalidateQueries({ queryKey: ["orders", user?.id] });
  }

  function buyAgain(orderId: string) {
    const items = itemsByOrder.get(orderId) ?? [];
    if (items.length === 0) {
      toast.error("Could not find the items in this order");
      return;
    }
    for (const it of items) {
      if (it.combo_id) {
        cart.add(
          {
            productId: it.combo_id,
            kind: "combo",
            comboItems: toComboItems(it.combo_items),
            title: it.title,
            image_url: it.image_url,
            price: Number(it.price),
            slug: null,
          },
          it.quantity,
        );
      } else {
        cart.add(
          {
            productId: it.product_id ?? it.title,
            title: it.title,
            image_url: it.image_url,
            price: Number(it.price),
            slug: null,
          },
          it.quantity,
        );
      }
    }
    toast.success("Items added to cart");
    navigate({ to: "/cart" });
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4">
      <LuckyCoinsPanel />
      <div className="mt-4">
        <h1 className="mb-3 text-xl font-semibold">My orders</h1>

        {/* Filter chips */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? orders.length
                : f.id === "active"
                  ? orders.filter((o) => !/delivered|cancelled/i.test(o.status ?? "")).length
                  : f.id === "delivered"
                    ? orders.filter((o) => /delivered/i.test(o.status ?? "")).length
                    : orders.filter((o) => /cancelled/i.test(o.status ?? "")).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : null}

        {!ordersQuery.isLoading && orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 font-semibold">No orders yet</p>
            <p className="text-sm text-muted-foreground">Orders you place will show up here.</p>
            <Link to="/">
              <Button className="mt-4">Start shopping</Button>
            </Link>
          </div>
        ) : null}

        {!ordersQuery.isLoading && filtered.length === 0 && orders.length > 0 ? (
          <p className="py-10 text-center text-muted-foreground">No {filter} orders.</p>
        ) : null}

        <div className="space-y-3">
          {filtered.map((o) => {
            const items = itemsByOrder.get(o.id) ?? [];
            const open = expandedId === o.id;
            const cancellable =
              canCustomerCancel(o.status ?? "") && !/cancelled/i.test(o.status ?? "");
            return (
              <div
                key={o.id}
                className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors ${
                  open ? "border-primary/50 ring-1 ring-primary/20" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : o.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-3 text-left sm:p-4"
                >
                  {items[0]?.image_url ? (
                    <img
                      src={storeImageUrl(items[0].image_url, 160)}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg bg-muted object-contain sm:h-20 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-20 sm:w-20">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">
                      {items[0]?.title ?? "Order items"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span>#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {items.length > 1 ? <span>+{items.length - 1} more item(s)</span> : null}
                    </p>
                    {o.delivery_estimate && !/delivered|cancelled/i.test(o.status ?? "") ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Truck className="h-3 w-3" /> Delivery by {o.delivery_estimate}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold">{inr(Number(o.total))}</p>
                    <p className={`text-xs font-semibold ${statusClass(o)}`}>{statusText(o)}</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open ? (
                  <div className="border-t border-border bg-muted/30 p-3 sm:p-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Loading items…</p>
                      ) : (
                        items.map((it) => {
                          const comboItems = toComboItems(it.combo_items);
                          return (
                            <div
                              key={it.id}
                              className="flex items-center gap-3 rounded-lg bg-card p-2"
                            >
                              {it.image_url ? (
                                <img
                                  src={storeImageUrl(it.image_url, 120)}
                                  alt={it.title}
                                  className="h-12 w-12 shrink-0 rounded object-contain"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1 text-sm">
                                <p className="line-clamp-2 font-medium">{it.title}</p>
                                {comboItems.length > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Includes: {comboItems.map((c) => c.title).join(", ")}
                                  </p>
                                ) : null}
                                <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
                              </div>
                              <span className="text-sm font-semibold">
                                {inr(Number(it.price) * it.quantity)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Address */}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Deliver to: <span className="text-foreground">{o.full_name}</span>,{" "}
                      {o.address_line}, {o.city}, {o.state} — {o.pincode} · {o.payment_method}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/order/$id"
                        params={{ id: o.id }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                      >
                        View details
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => buyAgain(o.id)}>
                        Buy again
                      </Button>
                      {cancellable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => void cancelOrder(o)}
                        >
                          Cancel order
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
