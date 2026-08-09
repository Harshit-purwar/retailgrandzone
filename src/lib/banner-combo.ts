import type { Banner, Product } from "@/lib/store-types";
import { toList } from "@/lib/store-types";

export function comboProductIds(banner: Banner): string[] {
  return toList(banner.product_ids).filter(Boolean);
}

/** A banner becomes a combo offer once it has linked products and a price. */
export function isComboBanner(banner: Banner): boolean {
  return comboProductIds(banner).length > 0 && Number(banner.price) > 0;
}

/**
 * Splits the combo price across the products proportionally to their own price,
 * so the cart total for the whole set exactly matches the banner price.
 */
export function splitComboPrice(products: Product[], comboPrice: number): number[] {
  const n = products.length;
  if (n === 0) return [];
  const weights = products.map((p) => Math.max(0, Number(p.price)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const out = products.map((_, i) =>
    totalWeight > 0
      ? Math.round((comboPrice * weights[i]) / totalWeight)
      : Math.floor(comboPrice / n),
  );
  out[n - 1] = comboPrice - out.slice(0, n - 1).reduce((a, b) => a + b, 0);
  return out;
}
