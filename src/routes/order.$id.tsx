import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem } from "@/lib/store-types";
import { CANCELLED_BY_CUSTOMER, ORDER_STATUSES, canCustomerCancel, inr } from "@/lib/store-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/lib/store-settings";
import { cancellationFeePercent, refundBreakdown } from "@/lib/policy";
import { orderMessage, waLink } from "@/lib/whatsapp";


export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order confirmed — The Grand Zone" },
      { name: "description", content: "Track your The Grand Zone order status, items and delivery address." },
      { property: "og:title", content: "Order confirmed — The Grand Zone" },
      { property: "og:description", content: "Track your The Grand Zone order status, items and delivery address." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const settings = useStoreSettings();


  const query = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;
      return {
        order: (orderRes.data ?? null) as unknown as Order | null,
        items: (itemsRes.data ?? []) as unknown as OrderItem[],
      };
    },
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const order = query.data?.order;
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Order not found</h1>
        <Link to="/orders" className="mt-4 inline-block text-primary underline">
          View my orders
        </Link>
      </div>
    );
  }

  const steps = ORDER_STATUSES.slice(0, 5);
  const activeIndex = steps.indexOf(order.status);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
      <div className="rounded-lg bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--deal)]" />
        <h1 className="mt-3 text-xl font-semibold">Order placed successfully</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order ID {order.id.slice(0, 8).toUpperCase()} · {order.payment_method} · {order.payment_status}
        </p>
      </div>

      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-4 font-semibold">Order status</h2>
        <ol className="grid gap-3 sm:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s} className="text-center text-xs">
              <span
                className={`mx-auto mb-2 block h-2 w-full rounded-full ${
                  i <= activeIndex ? "bg-[var(--deal)]" : "bg-muted"
                }`}
              />
              <span className={i <= activeIndex ? "font-medium" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg bg-card">
        <h2 className="border-b border-border px-4 py-3 font-semibold">Items</h2>
        {(query.data?.items ?? []).map((it) => (
          <div key={it.id} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
            <img src={it.image_url} alt={it.title} className="h-16 w-16 object-contain" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{it.title}</p>
              <p className="text-muted-foreground">Qty {it.quantity}</p>
            </div>
            <span className="font-semibold">{inr(Number(it.price) * it.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between px-4 py-3 font-semibold">
          <span>Total paid</span>
          <span>{inr(Number(order.total))}</span>
        </div>
      </div>

      <div className="rounded-lg bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Delivery address</h2>
        <p>
          {order.full_name} · {order.phone}
          <br />
          {order.address_line}, {order.city}, {order.state} — {order.pincode}
        </p>
      </div>

      <Link
        to="/products"
        search={{ q: undefined, category: undefined }}
        className="inline-block rounded bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Continue shopping
      </Link>
    </div>
  );
}
