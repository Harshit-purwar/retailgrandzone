import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShoppingCart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner, Product } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { comboProductIds, splitComboPrice } from "@/lib/banner-combo";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

function useBannerProducts(banner: Banner) {
  const ids = comboProductIds(banner);
  return useQuery({
    enabled: ids.length > 0,
    queryKey: ["banner-products", banner.id, ids.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Product[];
      return ids.map((id) => rows.find((p) => p.id === id)).filter(Boolean) as Product[];
    },
  });
}

/**
 * Banner that renders the admin-selected products as a combo at the banner price,
 * with a one-tap "Add all" that adds every selected product to the cart.
 */
export function ComboBanner({
  banner,
  compact = false,
  className = "",
}: {
  banner: Banner;
  compact?: boolean;
  className?: string;
}) {
  const cart = useCart();
  const combo = useBannerProducts(banner);
  const items = combo.data ?? [];
  const price = Number(banner.price);

  function addCombo() {
    if (items.length === 0) return;
    const prices = splitComboPrice(items, price);
    items.forEach((p, i) =>
      cart.add({
        productId: p.id,
        title: p.title,
        image_url: p.image_url,
        price: prices[i],
        slug: p.slug,
        stock: p.stock,
      }),
    );
    toast.success(`Combo added — ${items.length} items at ${inr(price)}`);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm ${className}`}
    >
      <div className="relative w-full overflow-hidden bg-muted">
        <img
          src={banner.image_url}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
        />
        <img
          src={banner.image_url}
          alt={banner.title}
          loading="lazy"
          className="relative h-full w-full object-contain"
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--deal)] px-2 py-0.5 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" /> Combo deal
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-white">
          <p className="line-clamp-2 text-[13px] font-bold leading-tight">{banner.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] opacity-85">
            {banner.subtitle || banner.cta_text}
          </p>
        </div>
      </div>

      {combo.isLoading ? (
        <p className="p-3 text-xs text-muted-foreground">Loading combo products…</p>
      ) : items.length > 0 ? (
        <div className="p-2.5 sm:p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Combo includes
            </p>
            <p className="text-base font-extrabold text-[var(--deal)]">{inr(price)}</p>
          </div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((p) => (
              <Link
                key={p.id}
                to="/product/$slug"
                params={{ slug: p.slug ?? p.id }}
                className="w-16 shrink-0 sm:w-20"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={p.image_url}
                  alt={p.title}
                  loading="lazy"
                  className="h-16 w-16 rounded-lg border border-border bg-white object-contain sm:h-20 sm:w-20"
                />
                <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight">{p.title}</p>
              </Link>
            ))}
          </div>
          <div className="mt-2">
            <Button
              size={compact ? "sm" : "default"}
              onClick={addCombo}
              className="w-full bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Add all {items.length} at {inr(price)}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
