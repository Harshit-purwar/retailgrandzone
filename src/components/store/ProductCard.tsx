import { Link } from "@tanstack/react-router";
import { Star, Clock, Plus, Minus } from "lucide-react";
import type { Product } from "@/lib/store-types";
import { discountPercent, inr } from "@/lib/store-types";
import { useCart } from "@/lib/cart-context";

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--deal)] px-1.5 py-0.5 text-xs font-semibold text-white">
        {Number(value).toFixed(1)}
        <Star className="h-3 w-3 fill-white" />
      </span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground">({count.toLocaleString("en-IN")})</span>
      ) : null}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(Number(product.price), Number(product.mrp));
  const { lines, add, setQuantity } = useCart();
  const line = lines.find((l) => l.productId === product.id);

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md">
      {off > 0 ? (
        <span className="absolute left-0 top-3 rounded-r-md bg-[oklch(0.55_0.16_255)] px-2 py-0.5 text-[10px] font-bold text-white">
          {off}% OFF
        </span>
      ) : null}

      <Link
        to="/product/$slug"
        params={{ slug: product.slug ?? product.id }}
        className="flex flex-1 flex-col"
      >
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-secondary">
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
          <Clock className="h-3 w-3" /> 12 MINS
        </span>

        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground">{product.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
        <div className="mt-1.5">
          <Rating value={Number(product.rating)} count={product.rating_count} />
        </div>
      </Link>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="leading-tight">
          <span className="block text-sm font-bold">{inr(Number(product.price))}</span>
          {off > 0 ? (
            <span className="block text-xs text-muted-foreground line-through">{inr(Number(product.mrp))}</span>
          ) : null}
        </div>

        {line ? (
          <div className="flex items-center gap-2 rounded-lg bg-primary px-1.5 py-1 text-primary-foreground">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(product.id, line.quantity - 1)}
              className="p-1"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-4 text-center text-sm font-bold">{line.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity(product.id, line.quantity + 1)}
              className="p-1"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              add({
                productId: product.id,
                title: product.title,
                image_url: product.image_url,
                price: Number(product.price),
                slug: product.slug ?? null,
              })
            }
            className="rounded-lg border border-primary bg-accent px-5 py-1.5 text-sm font-bold uppercase text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}
