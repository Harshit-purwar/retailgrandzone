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

/** Categories currently used by products, merged with the built-in list. */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("category").eq("active", true);
      if (error) throw error;
      const used = (data ?? []).map((r) => String((r as { category: string }).category)).filter(Boolean);
      return Array.from(new Set([...BASE_CATEGORIES, ...used]));
    },
  });
}
