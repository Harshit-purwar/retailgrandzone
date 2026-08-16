import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { Combo, Product } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { comboNormalTotal } from "@/lib/combos";
import { storeImageUrl } from "@/lib/store-image";

/** Compact combo offer card linking to the combo detail page. */
export function ComboCard({
  combo,
  products,
  className = "",
}: {
  combo: Combo;
  products: Product[];
  className?: string;
}) {
  const normal = comboNormalTotal(products);
  const price = Number(combo.combo_price);
  const savings = Math.max(0, normal - price);

  return (
    <Link
      to="/combo/$id"
      params={{ id: combo.id }}
      className={`group relative block overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {combo.image_url ? (
          <img
            src={storeImageUrl(combo.image_url, 640)}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
          />
        ) : null}
        {combo.image_url ? (
          <img
            src={storeImageUrl(combo.image_url, 640)}
            alt={combo.name}
            loading="lazy"
            className="relative h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Sparkles className="h-8 w-8" />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--deal)] px-2 py-0.5 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" /> Combo offer
        </span>
        {savings > 0 ? (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Save {inr(savings)}
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-tight">{combo.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"} included
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[var(--deal)]">{inr(price)}</span>
          {normal > price ? (
            <span className="text-xs text-muted-foreground line-through">{inr(normal)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
