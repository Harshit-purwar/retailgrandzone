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
import {
  couponDiscount,
  deliveryFeeFor,
  fetchCoupon,
  useStoreSettings,
} from "@/lib/store-settings";
import { detectCurrentLocation } from "@/lib/geo";
import { listAddresses, saveAddress, type Address } from "@/lib/addresses";
import { redeemCoins, useActiveCampaign, useCoinWallet, claimCoinReward } from "@/lib/lucky-coins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MapPin, Loader2, Home, Building2 } from "lucide-react";

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
      {
        name: "description",
        content:
          "Enter your delivery address and payment method to place your The Grand Zone order.",
      },
      { property: "og:title", content: "Checkout — The Grand Zone" },
      {
        property: "og:description",
        content: "Enter delivery address and payment method to place your order.",
      },
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
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [payment, setPayment] = useState("COD");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saveAddressOnPlace, setSaveAddressOnPlace] = useState(true);
  const [coinsToUse, setCoinsToUse] = useState(0);

  const { data: coinCampaign } = useActiveCampaign();
  const { data: coinWallet } = useCoinWallet(user?.id);
  const walletBalance = Number(coinWallet?.balance ?? 0);

  useEffect(() => {
    if (!user) return;
    listAddresses(user.id)
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setAddressesLoading(false));
  }, [user]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const loc = await detectCurrentLocation();
      setForm((f) => ({
        ...f,
        address_line: loc.address_line || f.address_line,
        city: loc.city || f.city,
        state: loc.state || f.state,
        pincode: loc.pincode || f.pincode,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
      toast.success(`Location detected — ${loc.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not detect your location");
    } finally {
      setLocating(false);
    }
  }

  function useSavedAddress(a: Address) {
    setForm({
      full_name: a.full_name || form.full_name,
      phone: a.phone || form.phone,
      address_line: a.address_line,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
    });
    toast.success(`Delivering to ${a.label}`);
  }

  const settings = useStoreSettings();
  const discount = couponDiscount(subtotal, coupon);
  const baseDelivery = deliveryFeeFor(subtotal, settings.data);
  const delivery = coupon?.free_delivery ? 0 : baseDelivery;
  const maxCoins = Math.min(walletBalance, subtotal - discount);
  const coinsToUseCapped = Math.max(0, Math.min(coinsToUse, maxCoins));
  const total = Math.max(0, subtotal - discount + delivery - coinsToUseCapped);

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
    if (!loading && !user)
      navigate({ to: "/auth", search: { redirect: "/checkout" }, replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && lines.length === 0) navigate({ to: "/cart", replace: true });
  }, [loading, user, lines.length, navigate]);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
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
        reject(
          new Error(
            desc?.description ||
              desc?.reason ||
              "Payment failed. Please try another UPI app or method.",
          ),
        );
      });
      checkout.open();
    });
  }

  async function placeOrder() {
    if (!user) return;
    setBusy(true);

    const saved = await (async () => {
      if (!saveAddressOnPlace) return null;
      try {
        return await saveAddress(user.id, { ...form }, false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/PGRST205|PGRST204|Could not find the table|Failed to fetch/i.test(msg)) return null;
        console.error("save address failed", msg);
        return null;
      }
    })();

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
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        total,
        coupon_code: coupon?.code ?? null,
        discount,
        delivery_fee: delivery,
        coins_applied: coinsToUseCapped,
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

    // Redeem Coins through the wallet ledger. The server only spends rewards
    // whose campaign covers an item category in this order, so `used` may be
    // smaller than requested; the order total is adjusted to match exactly.
    let coinsUsed = 0;
    if (coinsToUseCapped > 0) {
      try {
        const res = await redeemCoins(order.id, coinsToUseCapped);
        coinsUsed = Number(res.used ?? 0);
      } catch {
        coinsUsed = 0;
      }
      if (coinsUsed !== coinsToUseCapped) {
        const corrected = Math.max(0, total + (coinsToUseCapped - coinsUsed));
        await supabase
          .from("orders")
          .update({ total: corrected, coins_applied: coinsUsed })
          .eq("id", order.id);
        if (coinsUsed < coinsToUseCapped) {
          toast.info(`Applied ${inr(coinsUsed)} Coins — the rest is not eligible for this order.`);
        }
      }
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      lines.map((l) =>
        l.kind === "combo"
          ? {
              order_id: order.id,
              product_id: null,
              combo_id: l.productId,
              combo_items: (l.comboItems ?? []).map((c) => ({ id: c.id, title: c.title })),
              title: l.title,
              image_url: l.image_url,
              price: l.price,
              quantity: l.quantity,
            }
          : {
              order_id: order.id,
              product_id: l.productId,
              title: l.title,
              image_url: l.image_url,
              price: l.price,
              quantity: l.quantity,
            },
      ),
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
        // Return any Coins that were redeemed for this order to the wallet.
        if (coinsUsed > 0) {
          try {
            await supabase.rpc("release_coins_for_pending_order", {
              p_order_id: order.id,
            });
          } catch {
            /* coins stay locked — admin can refund manually */
          }
        }
        setBusy(false);
        return toast.error(err instanceof Error ? err.message : "Payment failed");
      }
    } else {
      toast.success("Order placed!");
    }

    // Fire-and-forget WhatsApp alert to the store admin (never blocks checkout).
    void fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(() => {});

    // Auto-claim today's Lucky Coins for this order (never blocks checkout).
    void claimCoinReward(order.id)
      .then((res) => {
        if (res.better_luck) {
          toast.info(res.message || "Better luck next time! You have reached the weekly Coins limit.");
        } else if (res.already_claimed) {
          // already claimed — nothing to show
        } else if (res.amount > 0) {
          toast.success(
            res.message ||
              `Lucky draw! You won ₹${res.amount} Coins. Valid until ${new Date(res.expires_at).toLocaleDateString()}.`,
          );
        }
      })
      .catch(() => {
        /* Coins stay claimable from the order page — not worth blocking checkout */
      });

    setBusy(false);
    clear();
    navigate({ to: "/order/$id", params: { id: order.id } });
  }

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <section className="rounded-lg bg-card">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              1
            </span>
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
              {!addressesLoading && addresses.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Saved addresses
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => useSavedAddress(a)}
                        className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-left text-sm transition-colors hover:border-primary"
                      >
                        {a.label.toLowerCase().includes("work") ||
                        a.label.toLowerCase().includes("office") ? (
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Home className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {a.label}
                            {a.is_default ? (
                              <span className="ml-1.5 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">
                                DEFAULT
                              </span>
                            ) : null}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {a.address_line}, {a.city}, {a.state} — {a.pincode}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-end gap-2 sm:col-span-2">
                <div className="flex-1">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" required value={form.full_name} onChange={set("full_name")} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locating}
                  onClick={useCurrentLocation}
                  className="shrink-0"
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {locating ? "Locating…" : "Use my location"}
                  </span>
                  <span className="sm:hidden">{locating ? "…" : "GPS"}</span>
                </Button>
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  required
                  pattern="[0-9]{10}"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address (house no, area, street)</Label>
                <Input
                  id="address"
                  required
                  value={form.address_line}
                  onChange={set("address_line")}
                />
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
                <Input
                  id="pincode"
                  required
                  pattern="[0-9]{6}"
                  value={form.pincode}
                  onChange={set("pincode")}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                <Checkbox
                  checked={saveAddressOnPlace}
                  onCheckedChange={(v) => setSaveAddressOnPlace(v === true)}
                />
                Save this address for next time
              </label>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
                >
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
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              2
            </span>
            <h2 className="font-semibold uppercase tracking-wide">Payment options</h2>
          </header>
          {step === 2 ? (
            <div className="p-4">
              <RadioGroup value={payment} onValueChange={setPayment} className="space-y-3">
                {[
                  {
                    v: "RAZORPAY",
                    l: "Pay online (Razorpay)",
                    d: "UPI, cards, netbanking & wallets — secure payment",
                  },
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
            <p className="p-4 text-sm text-muted-foreground">
              Complete the delivery address first.
            </p>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-2xl bg-card p-4 shadow-sm lg:sticky lg:top-32">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Price details
        </h2>
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
            <span className={delivery ? "" : "text-[var(--deal)]"}>
              {delivery ? inr(delivery) : "FREE"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coupon code
          </p>
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

        {coinCampaign ? (
          <div className="mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              {coinCampaign.name}
            </p>
            <p className="mb-2 text-sm text-amber-800">
              Wallet: {inr(walletBalance)}
              {coinsToUseCapped > 0 ? ` · Applying ${inr(coinsToUseCapped)}` : ""}
            </p>
            {walletBalance > 0 ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={maxCoins}
                  value={coinsToUse === 0 ? "" : coinsToUse}
                  onChange={(e) =>
                    setCoinsToUse(Math.max(0, Math.min(maxCoins, Number(e.target.value) || 0)))
                  }
                  placeholder="Coins to use"
                  aria-label="Coins to use"
                  className="bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 bg-white"
                  onClick={() => setCoinsToUse(maxCoins)}
                >
                  Max
                </Button>
              </div>
            ) : (
              <p className="text-xs text-amber-700">
                You have no Coins yet. Complete an eligible order to earn some.
              </p>
            )}
            <p className="mt-2 text-[11px] leading-snug text-amber-700">
              Coins can only be used on eligible categories and are applied after coupon discount.
              They cannot be withdrawn as cash.
            </p>
          </div>
        ) : null}

        {coinsToUseCapped > 0 ? (
          <div className="flex justify-between text-sm text-amber-700">
            <span>Coins applied</span>
            <span>− {inr(coinsToUseCapped)}</span>
          </div>
        ) : null}

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
