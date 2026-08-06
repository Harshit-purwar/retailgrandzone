import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem } from "@/lib/store-types";
import { CANCELLED_BY_CUSTOMER, ORDER_STATUSES, canCustomerCancel, inr } from "@/lib/store-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/lib/store-settings";
import { cancellationFeePercent, refundBreakdown } from "@/lib/policy";
import { orderState, orderStateLabel } from "@/lib/order-status";


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
  const prepaid = (order.payment_status ?? "").toLowerCase() === "paid";
  const percent = cancellationFeePercent(settings.data);
  const refund = refundBreakdown(Number(order.total), percent);
  const state = orderState(order);

  async function cancelOrder() {
    if (!order) return;
    const message = prepaid
      ? `Cancel this order? A ${percent}% processing fee (${inr(refund.fee)}) will be deducted and ${inr(refund.refund)} refunded.`
      : "Cancel this order?";
    if (!window.confirm(message)) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: CANCELLED_BY_CUSTOMER, cancelled_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(prepaid ? `Order cancelled — ${inr(refund.refund)} will be refunded` : "Order cancelled");
    qc.invalidateQueries({ queryKey: ["order", order.id] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
      <div className="rounded-lg bg-card p-6 text-center">
        {state === "successful" ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--deal)]" />
        ) : state === "pending" ? (
          <Clock className="mx-auto h-12 w-12 text-[var(--brand,orange)]" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
        )}
        <h1 className="mt-3 text-xl font-semibold">{orderStateLabel(state)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order ID {order.id.slice(0, 8).toUpperCase()} · {order.payment_method} · {order.payment_status}
        </p>
        {state === "failed" ? (
          <p className="mt-2 text-sm text-destructive">
            Your payment was not completed, so this order has not been confirmed. You can place it again from your cart.
          </p>
        ) : null}
        {state === "pending" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            We are waiting for payment confirmation. The order is confirmed only once the payment succeeds.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/invoice/$id" params={{ id: order.id }}>
              <FileText className="mr-1 h-4 w-4" /> View invoice
            </Link>
          </Button>
        </div>
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

      <div className="rounded-lg bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Cancellation &amp; refund</h2>
        {prepaid ? (
          <p>
            This order is prepaid. If you cancel or return it, a {percent}% processing fee ({inr(refund.fee)}) is
            deducted and <strong>{inr(refund.refund)}</strong> is refunded to your original payment method.
          </p>
        ) : (
          <p>Cash on delivery orders can be cancelled free of charge before dispatch.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {canCustomerCancel(order.status) ? (
            <Button variant="destructive" size="sm" onClick={cancelOrder}>
              Cancel order
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link to="/policy">Read full policy</Link>
          </Button>
        </div>
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
