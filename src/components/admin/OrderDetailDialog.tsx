import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function OrderDetailDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const items = useQuery({
    enabled: !!order,
    queryKey: ["admin", "order-items", order?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", order!.id);
      if (error) throw error;
      return (data ?? []) as unknown as OrderItem[];
    },
  });

  const o = order as (Order & Record<string, unknown>) | null;

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Order {order ? order.id.slice(0, 8).toUpperCase() : ""}</DialogTitle>
        </DialogHeader>
        {o ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
              <Row label="Name" value={o.full_name} />
              <Row label="Phone" value={<a href={`tel:${o.phone}`}>{o.phone}</a>} />
              <Row label="Email" value={o.email ?? "—"} />
              <Row
                label="Address"
                value={`${o.address_line}, ${o.city}, ${o.state} — ${o.pincode}`}
              />
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</p>
              <Row label="Method" value={o.payment_method} />
              <Row label="Status" value={o.payment_status} />
              {o.payment_id ? <Row label="Payment ID" value={String(o.payment_id)} /> : null}
              <Row label="Order status" value={o.status} />
              {o.delivery_estimate ? <Row label="Delivery estimate" value={String(o.delivery_estimate)} /> : null}
              <Row label="Placed on" value={new Date(o.created_at).toLocaleString("en-IN")} />
              {o.cancel_reason ? <Row label="Cancellation reason" value={String(o.cancel_reason)} /> : null}
              {o.latitude && o.longitude ? (
                <Row
                  label="Live location"
                  value={
                    <a
                      className="text-primary underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                    >
                      {Number(o.latitude).toFixed(4)}, {Number(o.longitude).toFixed(4)}
                    </a>
                  }
                />
              ) : null}
            </div>

            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
              {items.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
              <div className="space-y-2">
                {(items.data ?? []).map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.title} className="h-12 w-12 rounded object-cover" />
                    ) : null}
                    <div className="flex-1 text-sm">
                      <p className="line-clamp-2 font-medium">{it.title}</p>
                      <p className="text-muted-foreground">Qty {it.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold">{inr(Number(it.price) * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-border pt-2">
                {o.coupon_code ? <Row label="Coupon" value={String(o.coupon_code)} /> : null}
                {o.discount ? <Row label="Discount" value={`− ${inr(Number(o.discount))}`} /> : null}
                <Row
                  label="Delivery fee"
                  value={Number(o.delivery_fee ?? 0) ? inr(Number(o.delivery_fee)) : "FREE"}
                />
                <Row label="Total" value={<span className="text-base">{inr(Number(o.total))}</span>} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
