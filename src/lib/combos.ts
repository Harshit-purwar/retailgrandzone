import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Combo, Product } from "@/lib/store-types";
import { toList } from "@/lib/store-types";
import { useFastQuery } from "@/lib/fast-query";
import { scopeToStore } from "@/lib/stores";

/** Product ids bundled in a combo (parsed from its product_ids jsonb column). */
export function comboProductIds(combo: Pick<Combo, "product_ids">): string[] {
  return toList(combo.product_ids).filter(Boolean);
}

/** Fetches the actual product rows behind a combo, preserving the combo's order. */
export async function fetchComboProducts(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("products").select("*").in("id", ids);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Product[];
  return ids.map((id) => rows.find((p) => p.id === id)).filter((p): p is Product => !!p);
}

export function useCombo(id: string) {
  return useQuery({
    queryKey: ["combo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("combos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Combo | null;
    },
  });
}

export function useComboProducts(ids: string[]) {
  return useQuery({
    enabled: ids.length > 0,
    queryKey: ["combo-products", ids.join(",")],
    queryFn: () => fetchComboProducts(ids),
  });
}

/** Enabled combos shown on the storefront (optionally scoped to a store). */
export function useCombos(storeId: string | null) {
  return useFastQuery<Combo[]>({
    queryKey: ["combos", "storefront", storeId ?? ""],
    queryFn: async () => {
      const base = supabase.from("combos").select("*").eq("active", true);
      const { data, error } = await scopeToStore(base, storeId).order("created_at", {
        ascending: false,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Combo[];
    },
  });
}

/** True when every bundled product exists, is active and has stock. */
export function comboAvailable(products: Product[]): boolean {
  return products.length > 0 && products.every((p) => p.active && Number(p.stock) > 0);
}

/** Normal total of the bundled products at their individual prices. */
export function comboNormalTotal(products: Product[]): number {
  return products.reduce((n, p) => n + Number(p.price || 0), 0);
}

/** Max quantity purchasable = the minimum stock across bundled products. */
export function comboMaxStock(products: Product[]): number {
  if (products.length === 0) return 0;
  return Math.min(...products.map((p) => Math.max(0, Number(p.stock))));
}
