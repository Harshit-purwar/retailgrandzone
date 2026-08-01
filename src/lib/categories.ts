import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BASE_CATEGORIES = [
  "Mobiles",
  "Laptops",
  "Audio",
  "Fashion",
  "Footwear",
  "Appliances",
  "Televisions",
  "Kitchen",
  "Bags",
  "Wearables",
];

export type Category = {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

/** Admin-managed categories (all rows, including disabled ones). */
export function useManagedCategories() {
  return useQuery({
    queryKey: ["categories", "managed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });
}

/** Enabled category names for the storefront, merged with categories used by products. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("name,sort_order,active").order("sort_order").order("name"),
        supabase.from("products").select("category").eq("active", true),
      ]);
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      const managed = (catRes.data ?? []) as unknown as { name: string; active: boolean }[];
      const enabled = managed.filter((c) => c.active).map((c) => c.name);
      const disabled = new Set(managed.filter((c) => !c.active).map((c) => c.name));

      if (managed.length > 0) {
        const used = (prodRes.data ?? [])
          .map((r) => String((r as { category: string }).category))
          .filter((c) => c && !disabled.has(c));
        return Array.from(new Set([...enabled, ...used]));
      }

      const used = (prodRes.data ?? []).map((r) => String((r as { category: string }).category)).filter(Boolean);
      return Array.from(new Set([...BASE_CATEGORIES, ...used]));
    },
  });
}
