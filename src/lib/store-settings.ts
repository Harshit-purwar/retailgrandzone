import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_PHONE = "6392480868";

export type StoreSettings = {
  id: string;
  delivery_fee_enabled: boolean;
  delivery_fee: number;
  free_delivery_above: number;
  delivery_estimate: string;
  support_phone: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  min_order: number;
  max_discount: number;
  free_delivery: boolean;
  active: boolean;
  expires_at: string | null;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  id: "",
  delivery_fee_enabled: false,
  delivery_fee: 0,
  free_delivery_above: 0,
  delivery_estimate: "2-4 Days",
  support_phone: SUPPORT_PHONE,
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      const row = data as unknown as Partial<StoreSettings> | null;
      return row ? { ...DEFAULT_SETTINGS, ...row } : DEFAULT_SETTINGS;
    },
  });
}

/**
 * Estimated delivery window shown to the customer.
 * With a live location we can promise same/next-day; otherwise we fall back to
 * the default estimate the admin configured.
 */
export function deliveryEstimate(settings?: StoreSettings | null, hasLiveLocation?: boolean): string {
  const fallback = (settings?.delivery_estimate || DEFAULT_SETTINGS.delivery_estimate).trim();
  if (!hasLiveLocation) return fallback;
  return new Date().getHours() < 16 ? "Today" : "Tomorrow";
}

export function supportPhone(settings?: StoreSettings | null): string {
  return (settings?.support_phone || SUPPORT_PHONE).trim();
}

/** Delivery fee for a subtotal — 0 when disabled or above the free-delivery threshold. */
export function deliveryFeeFor(subtotal: number, settings?: StoreSettings | null): number {
  if (!settings || !settings.delivery_fee_enabled) return 0;
  if (subtotal <= 0) return 0;
  const threshold = Number(settings.free_delivery_above) || 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  return Math.max(0, Number(settings.delivery_fee) || 0);
}

export function couponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (subtotal < Number(coupon.min_order || 0)) return 0;
  let amount =
    coupon.discount_type === "flat"
      ? Number(coupon.value || 0)
      : (subtotal * Number(coupon.value || 0)) / 100;
  const cap = Number(coupon.max_discount || 0);
  if (cap > 0) amount = Math.min(amount, cap);
  return Math.max(0, Math.min(Math.round(amount), subtotal));
}

/** Looks up an active, unexpired coupon by code. Throws a friendly message otherwise. */
export async function fetchCoupon(code: string, subtotal: number): Promise<Coupon> {
  const clean = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("active", true)
    .ilike("code", clean)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const coupon = data as unknown as Coupon | null;
  if (!coupon) throw new Error("This coupon code is not valid");
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    throw new Error("This coupon has expired");
  }
  if (subtotal < Number(coupon.min_order || 0)) {
    throw new Error(`Coupon valid on orders above ₹${Math.round(Number(coupon.min_order))}`);
  }
  return coupon;
}
