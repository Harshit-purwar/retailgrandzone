import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
  id: string;
  delivery_fee_enabled: boolean;
  delivery_fee: number;
  free_delivery_above: number;
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
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data as unknown as StoreSettings | null) ?? DEFAULT_SETTINGS;
    },
  });
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
