import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedStore } from "@/lib/stores";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { inr } from "@/lib/store-types";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import type { Coupon } from "@/lib/store-settings";
import { couponDiscount, deliveryFeeFor, fetchCoupon, useStoreSettings } from "@/lib/store-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — The Grand Zone" },
      { name: "description", content: "Enter your delivery address and payment method to place your The Grand Zone order." },
      { property: "og:title", content: "Checkout — The Grand Zone" },
      { property: "og:description", content: "Enter delivery address and payment method to place your order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { lines, subtotal, clear } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const { store } = useSelectedStore();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [payment, setPayment] = useState("COD");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const settings = useStoreSettings();
  const discount = couponDiscount(subtotal, coupon);
  const baseDelivery = deliveryFeeFor(subtotal, settings.data);
  const delivery = coupon?.free_delivery ? 0 : baseDelivery;
  const total = Math.max(0, subtotal - discount + delivery);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const found = await fetchCoupon(couponInput, subtotal);
      setCoupon(found);
      toast.success(`Coupon ${found.code} applied`);
    } catch (err) {
      setCoupon(null);
      toast.error(err instanceof Error ? err.message : "Invalid coupon");
    } finally {
      setCouponBusy(false);
    }
  }


  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/checkout" }, replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && lines.length === 0) navigate({ to: "/cart", replace: true });
  }, [loading, user, lines.length, navigate]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function payWithRazorpay(orderId: string) {
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) throw new Error("Could not load Razorpay checkout");
    const rzp = await createRazorpayOrder({ data: { orderId } });

    // Razorpay's UPI / QR flow validates prefill values strictly: an empty email
    // or a phone without the country code makes it reject the VPA ("Invalid UPI ID").
    const digits = form.phone.replace(/\D/g, "").slice(-10);
    const prefill: Record<string, string> = {};
    if (form.full_name.trim()) prefill.name = form.full_name.trim();
    if (digits.length === 10) prefill.contact = `+91${digits}`;
    if (user?.email) prefill.email = user.email;

    await new Promise<void>((resolve, reject) => {
      const checkout = new window.Razorpay!({
        key: rzp.keyId,
        amount: rzp.amount,
        currency: "INR",
        name: "The Grand Zone",
        description: "Order payment",
        order_id: rzp.razorpayOrderId,
        prefill,
        notes: { order_id: orderId },
        theme: { color: "#0d0d0d" },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        handler: (response: Record<string, string>) => {
          verifyRazorpayPayment({
            data: {
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          })
            .then(() => resolve())
            .catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              reject(
                new Error(
                  /unauthor|token|session/i.test(msg)
                    ? `Payment received (ID ${response.razorpay_payment_id}) but we could not confirm it — your session expired. Please contact support with this payment ID.`
                    : `Payment received (ID ${response.razorpay_payment_id}) but confirmation failed: ${msg}`,
                ),
              );
            });
        },
      }) as { open: () => void; on?: (e: string, cb: (r: unknown) => void) => void };

      checkout.on?.("payment.failed", (resp: unknown) => {
        const desc = (resp as { error?: { description?: string; reason?: string } })?.error;
        reject(new Error(desc?.description || desc?.reason || "Payment failed. Please try another UPI app or method."));
      });
      checkout.open();
    });
  }


  async function placeOrder() {
    if (!user) return;
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        email: user.email,
        full_name: form.full_name,
        phone: form.phone,
        address_line: form.address_line,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        total,
        coupon_code: coupon?.code ?? null,
        discount,
        delivery_fee: delivery,
        store_id: store?.id ?? null,
        delivery_estimate: store?.delivery_estimate ?? null,
        payment_method: payment,
        payment_status: "Pending",
        status: "Ordered",
      })
      .select()
      .single();

    if (error || !order) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not place order");
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        title: l.title,
        image_url: l.image_url,
        price: l.price,
        quantity: l.quantity,
      })),
    );
    if (itemsError) {
      setBusy(false);
      return toast.error(itemsError.message);
    }

    if (payment === "RAZORPAY") {
      try {
        await payWithRazorpay(order.id);
        toast.success("Payment successful!");
      } catch (err) {
        // Mark the order as a failed online payment: the customer still sees it
        // in their orders as "Failed", while the admin panel hides it.
        await supabase
          .from("orders")
          .update({ payment_status: "Failed", status: "Payment Failed" })
          .eq("id", order.id);
        setBusy(false);
        return toast.error(err instanceof Error ? err.message : "Payment failed");
      }
    } else {
      toast.success("Order placed!");
    }

    // Successful orders are pushed to the admin's WhatsApp automatically.
    notifyAdminOnWhatsApp(
      {
        ...(order as unknown as Order),
        payment_status: payment === "RAZORPAY" ? "Paid" : "Pending",
      },
      lines.map((l) => ({
        id: l.productId,
        order_id: order.id,
        product_id: l.productId,
        title: l.title,
        image_url: l.image_url,
        price: l.price,
        quantity: l.quantity,
      })),
    );

    setBusy(false);
    clear();
    navigate({ to: "/order/$id", params: { id: order.id } });
  }



  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <section className="rounded-lg bg-card">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">1</span>
            <h2 className="font-semibold uppercase tracking-wide">Delivery address</h2>
          </header>
          {step === 1 ? (
            <form
              className="grid gap-4 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
            >
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.full_name} onChange={set("full_name")} />
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" required pattern="[0-9]{10}" value={form.phone} onChange={set("phone")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address (house no, area, street)</Label>
                <Input id="address" required value={form.address_line} onChange={set("address_line")} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" required value={form.city} onChange={set("city")} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" required value={form.state} onChange={set("state")} />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" required pattern="[0-9]{6}" value={form.pincode} onChange={set("pincode")} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90">
                  Deliver here
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-4 p-4 text-sm">
              <p>
                <span className="font-semibold">{form.full_name}</span> {form.phone}
                <br />
                {form.address_line}, {form.city}, {form.state} — {form.pincode}
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Change
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-lg bg-card">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">2</span>
            <h2 className="font-semibold uppercase tracking-wide">Payment options</h2>
          </header>
          {step === 2 ? (
            <div className="p-4">
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-3">
                {[
                  { v: "RAZORPAY", l: "Pay online (Razorpay)", d: "UPI, cards, netbanking & wallets — secure payment" },
                  { v: "COD", l: "Cash on delivery", d: "Pay in cash when the order arrives" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="flex cursor-pointer items-start gap-3 rounded border border-border p-3 has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value={o.v} id={`pay-${o.v}`} className="mt-1" />
                    <span>
                      <span className="block text-sm font-medium">{o.l}</span>
                      <span className="block text-xs text-muted-foreground">{o.d}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <Button
                className="mt-4 bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
                size="lg"
                disabled={busy}
                onClick={placeOrder}
              >
                {busy ? "Placing order…" : `Place order · ${inr(total)}`}
              </Button>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Complete the delivery address first.</p>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-2xl bg-card p-4 shadow-sm lg:sticky lg:top-32">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Price details</h2>
        <div className="space-y-2 text-sm">
          {lines.map((l) => (
            <div key={l.productId} className="flex justify-between gap-3">
              <span className="line-clamp-1">
                {l.title} × {l.quantity}
              </span>
              <span>{inr(l.price * l.quantity)}</span>
            </div>
          ))}
          {discount > 0 ? (
            <div className="flex justify-between border-t border-dashed border-border pt-2 text-[var(--deal)]">
              <span>Coupon {coupon?.code}</span>
              <span>− {inr(discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-dashed border-border pt-2">
            <span>Delivery</span>
            <span className={delivery ? "" : "text-[var(--deal)]"}>{delivery ? inr(delivery) : "FREE"}</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coupon code</p>
          {coupon ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{coupon.code} applied</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCoupon(null);
                  setCouponInput("");
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter code (optional)"
                aria-label="Coupon code"
              />
              <Button type="button" variant="outline" disabled={couponBusy} onClick={applyCoupon}>
                {couponBusy ? "…" : "Apply"}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{inr(total)}</span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Prepaid orders cancelled or returned are refunded after a{" "}
          {settings.data?.cancellation_fee_percent ?? 4}% payment processing fee.{" "}
          <Link to="/policy" className="text-primary underline">
            Read the policy
          </Link>
          .
        </p>

      </aside>

    </div>
  );
}
