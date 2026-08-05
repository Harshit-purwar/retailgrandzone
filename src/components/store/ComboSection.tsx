import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { inr, toList } from "@/lib/store-types";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";

/**
 * Frequently bought together: admin-picked combo products for this product,
 * with a one-click "Add all to cart".
 */
export function ComboSection({ product }: { product: Product }) {
  const cart = useCart();
  const ids = useMemo(() => toList(product.combo_product_ids).filter(Boolean), [product.combo_product_ids]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const combo = useQuery({
    enabled: ids.length > 0,
    queryKey: ["combo", product.id, ids.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").in("id", ids).eq("active", true);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const items = combo.data ?? [];
  if (items.length === 0) return null;

  const chosen = items.filter((p) => !skipped.includes(p.id));
  const total = Number(product.price) + chosen.reduce((n, p) => n + Number(p.price), 0);

  function addAll() {
    cart.add({
      productId: product.id,
      title: product.title,
      image_url: product.image_url,
      price: Number(product.price),
      slug: product.slug,
      stock: product.stock,
    });
    chosen.forEach((p) =>
      cart.add({
        productId: p.id,
        title: p.title,
        image_url: p.image_url,
        price: Number(p.price),
        slug: p.slug,
        stock: p.stock,
      }),
    );
    toast.success(`${chosen.length + 1} items added to cart`);
  }

  return (
    <section className="mt-4 rounded-2xl bg-card p-3 sm:p-4">
      <h2 className="mb-3 text-base font-bold sm:text-xl">Frequently bought together</h2>
      <div className="flex flex-wrap items-center gap-3">
        <ComboTile image={product.image_url} title={product.title} price={Number(product.price)} />
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <label className="cursor-pointer">
              <ComboTile image={p.image_url} title={p.title} price={Number(p.price)} dim={skipped.includes(p.id)} />
              <span className="mt-1 flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={!skipped.includes(p.id)}
                  onChange={(e) =>
                    setSkipped((s) => (e.target.checked ? s.filter((id) => id !== p.id) : [...s, p.id]))
                  }
                />
                Include
              </span>
            </label>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-lg font-bold">Combo total: {inr(total)}</span>
        <Button onClick={addAll} className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90">
          Add all to cart
        </Button>
      </div>
    </section>
  );
}

function ComboTile({ image, title, price, dim }: { image: string; title: string; price: number; dim?: boolean }) {
  return (
    <div className={`w-28 ${dim ? "opacity-40" : ""}`}>
      <img src={image} alt={title} loading="lazy" className="h-24 w-28 rounded-lg border border-border bg-white object-contain" />
      <p className="mt-1 line-clamp-2 text-xs">{title}</p>
      <p className="text-xs font-semibold">{inr(price)}</p>
    </div>
  );
}
