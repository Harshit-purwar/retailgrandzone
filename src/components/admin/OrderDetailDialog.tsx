import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import type { InvoiceOrder } from "@/lib/invoice";
import { invoiceNumber } from "@/lib/invoice";
import { InvoiceView } from "@/components/store/InvoiceView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Admin invoice panel: preview, edit the invoice fields and print / save as PDF. */
function InvoicePanel({ order, items }: { order: InvoiceOrder; items: OrderItem[] }) {
  const [form, setForm] = useState({
    invoice_number: "",
    seller_gstin: "",
    customer_gstin: "",
    gst_percent: 0,
    invoice_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setForm({
      invoice_number: order.invoice_number ?? "",
      seller_gstin: order.seller_gstin ?? "",
      customer_gstin: order.customer_gstin ?? "",
      gst_percent: Number(order.gst_percent ?? 0),
      invoice_notes: order.invoice_notes ?? "",
    });
  }, [order.id, order.invoice_number, order.seller_gstin, order.customer_gstin, order.gst_percent, order.invoice_notes]);

  const merged: InvoiceOrder = { ...order, ...form };

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({
        invoice_number: form.invoice_number.trim() || null,
        seller_gstin: form.seller_gstin,
        customer_gstin: form.customer_gstin,
        gst_percent: Number(form.gst_percent) || 0,
        invoice_notes: form.invoice_notes,
      } as never)
      .eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Invoice updated");
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="inv-no">Invoice number</Label>
          <Input
            id="inv-no"
            placeholder={invoiceNumber(order)}
            value={form.invoice_number}
            onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="inv-gst">GST %</Label>
          <Input
            id="inv-gst"
            type="number"
            min={0}
            max={28}
            value={form.gst_percent}
            onChange={(e) => setForm((f) => ({ ...f, gst_percent: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="inv-seller">Seller GSTIN</Label>
          <Input
            id="inv-seller"
            value={form.seller_gstin}
            onChange={(e) => setForm((f) => ({ ...f, seller_gstin: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="inv-customer">Customer GSTIN</Label>
          <Input
            id="inv-customer"
            value={form.customer_gstin}
            onChange={(e) => setForm((f) => ({ ...f, customer_gstin: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="inv-notes">Notes on invoice</Label>
          <Textarea
            id="inv-notes"
            rows={2}
            value={form.invoice_notes}
            onChange={(e) => setForm((f) => ({ ...f, invoice_notes: e.target.value }))}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save invoice"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPreview((v) => !v)}>
          <FileText className="mr-1 h-4 w-4" /> {preview ? "Hide invoice" : "View invoice"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Download className="mr-1 h-4 w-4" /> Download PDF
        </Button>
      </div>
      {preview ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <InvoiceView order={merged} items={items} />
        </div>
      ) : null}
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

            <InvoicePanel order={o as unknown as InvoiceOrder} items={items.data ?? []} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
