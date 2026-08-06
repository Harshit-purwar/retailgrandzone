import type { Order, OrderItem } from "@/lib/store-types";

export type InvoiceFields = {
  invoice_number?: string | null;
  invoice_notes?: string | null;
  customer_gstin?: string | null;
  seller_gstin?: string | null;
  gst_percent?: number | null;
};

export type InvoiceOrder = Order & InvoiceFields & {
  coupon_code?: string | null;
  discount?: number | null;
  delivery_fee?: number | null;
};

/** Stable, human-friendly invoice number derived from the order when unset. */
export function invoiceNumber(order: InvoiceOrder): string {
  const custom = (order.invoice_number ?? "").trim();
  if (custom) return custom;
  const d = new Date(order.created_at);
  return `TGZ-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${order.id.slice(0, 8).toUpperCase()}`;
}

export type InvoiceTotals = {
  itemsTotal: number;
  discount: number;
  delivery: number;
  gstPercent: number;
  taxable: number;
  gstAmount: number;
  grandTotal: number;
};

/**
 * GST is treated as inclusive in the order total (Indian retail convention):
 * we back-calculate the tax component instead of adding it on top, so the
 * invoice grand total always matches what the customer actually paid.
 */
export function invoiceTotals(order: InvoiceOrder, items: OrderItem[]): InvoiceTotals {
  const itemsTotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
  const discount = Number(order.discount ?? 0) || 0;
  const delivery = Number(order.delivery_fee ?? 0) || 0;
  const grandTotal = Number(order.total) || 0;
  const gstPercent = Number(order.gst_percent ?? 0) || 0;
  const gstAmount = gstPercent > 0 ? Math.round((grandTotal * gstPercent) / (100 + gstPercent)) : 0;
  return {
    itemsTotal,
    discount,
    delivery,
    gstPercent,
    taxable: grandTotal - gstAmount,
    gstAmount,
    grandTotal,
  };
}
