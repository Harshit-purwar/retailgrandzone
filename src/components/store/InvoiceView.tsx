import logo from "@/assets/grandzone-logo.png";
import type { OrderItem } from "@/lib/store-types";
import { inr, toComboItems } from "@/lib/store-types";
import { invoiceNumber, invoiceTotals, type InvoiceOrder } from "@/lib/invoice";
import { orderState, orderStateLabel } from "@/lib/order-status";

/** Print-ready A4 invoice: logo, branding, parties, items, GST and totals. */
export function InvoiceView({ order, items }: { order: InvoiceOrder; items: OrderItem[] }) {
  const t = invoiceTotals(order, items);
  const state = orderState(order);

  return (
    <div
      id="invoice-sheet"
      className="mx-auto w-full max-w-[820px] bg-card p-6 text-foreground shadow-sm print:max-w-none print:p-0 print:shadow-none"
    >
      <header className="flex items-start justify-between gap-6 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="The Grand Zone" className="h-14 w-14 rounded-full object-contain" />
          <div>
            <p className="text-lg font-bold leading-tight">The Grand Zone</p>
            <p className="text-xs text-muted-foreground">Quality products, delivered fast.</p>
            {order.seller_gstin ? (
              <p className="text-xs text-muted-foreground">GSTIN: {order.seller_gstin}</p>
            ) : null}
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="text-base font-bold uppercase tracking-wide">Tax invoice</p>
          <p className="mt-1">
            <span className="text-muted-foreground">Invoice no. </span>
            <span className="font-semibold">{invoiceNumber(order)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Date </span>
            {new Date(order.created_at).toLocaleDateString("en-IN")}
          </p>
          <p>
            <span className="text-muted-foreground">Order </span>
            {order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </header>

      <section className="grid gap-4 py-4 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Billed to
          </p>
          <p className="font-medium">{order.full_name}</p>
          <p>{order.phone}</p>
          {order.email ? <p>{order.email}</p> : null}
          <p>
            {order.address_line}, {order.city}, {order.state} — {order.pincode}
          </p>
          {order.customer_gstin ? <p className="mt-1">GSTIN: {order.customer_gstin}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment
          </p>
          <p>{order.payment_method}</p>
          <p
            className={
              state === "successful"
                ? "font-semibold text-[var(--deal)]"
                : "font-semibold text-destructive"
            }
          >
            {orderStateLabel(state)} · {order.payment_status}
          </p>
          {order.payment_id ? (
            <p className="text-xs text-muted-foreground">Ref {order.payment_id}</p>
          ) : null}
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted text-left">
            <th className="px-3 py-2 font-semibold">Item</th>
            <th className="px-3 py-2 text-center font-semibold">Qty</th>
            <th className="px-3 py-2 text-right font-semibold">Rate</th>
            <th className="px-3 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const comboItems = toComboItems(it.combo_items);
            return (
              <tr key={it.id} className="border-b border-border">
                <td className="px-3 py-2">
                  {it.title}
                  {comboItems.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Includes: {comboItems.map((c) => c.title).join(", ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-center">{it.quantity}</td>
                <td className="px-3 py-2 text-right">{inr(Number(it.price))}</td>
                <td className="px-3 py-2 text-right">
                  {inr(Number(it.price) * Number(it.quantity))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items total</dt>
            <dd>{inr(t.itemsTotal)}</dd>
          </div>
          {t.discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
              </dt>
              <dd>− {inr(t.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd>{t.delivery ? inr(t.delivery) : "FREE"}</dd>
          </div>
          {t.gstPercent > 0 ? (
            <>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Taxable value</dt>
                <dd>{inr(t.taxable)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">GST @ {t.gstPercent}% (inclusive)</dt>
                <dd>{inr(t.gstAmount)}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <dt>Grand total</dt>
            <dd>{inr(t.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      {order.invoice_notes ? (
        <p className="mt-4 rounded-lg bg-muted p-3 text-xs">{order.invoice_notes}</p>
      ) : null}

      <footer className="mt-6 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
        This is a computer-generated invoice and does not require a signature. Thank you for
        shopping with The Grand Zone.
      </footer>
    </div>
  );
}
