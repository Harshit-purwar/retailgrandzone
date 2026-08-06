import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { orderState, orderStateLabel } from "@/lib/order-status";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My orders — The Grand Zone" },
      { name: "description", content: "See all the orders you have placed on The Grand Zone and their current status." },
      { property: "og:title", content: "My orders — The Grand Zone" },
      { property: "og:description", content: "See all the orders you have placed on The Grand Zone." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/orders" }, replace: true });
  }, [loading, user, navigate]);

  const query = useQuery({
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

  const orders = query.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <div className="rounded-lg bg-card p-4">
        <h1 className="mb-4 text-xl font-semibold">My orders</h1>
        {query.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {!query.isLoading && orders.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">You haven't placed any orders yet.</p>
        ) : null}
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/order/$id"
              params={{ id: o.id }}
              className="flex items-center justify-between rounded border border-border p-4 hover:border-primary"
            >
              <div className="text-sm">
                <p className="font-medium">Order {o.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("en-IN")} · {o.payment_method}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{inr(Number(o.total))}</p>
                {(() => {
                  const state = orderState(o);
                  if (state === "successful") return <p className="text-[var(--deal)]">{o.status}</p>;
                  return (
                    <p
                      className={
                        state === "pending" ? "font-semibold text-muted-foreground" : "font-semibold text-destructive"
                      }
                    >
                      {orderStateLabel(state)}
                    </p>
                  );
                })()}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
