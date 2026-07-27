import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Product } from "@/lib/store-types";
import { discountPercent, inr } from "@/lib/store-types";

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded bg-[var(--deal)] px-1.5 py-0.5 text-xs font-semibold text-white">
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
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug ?? product.id }}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-lg"
    >
      <div className="flex h-44 items-center justify-center overflow-hidden rounded bg-white">
        <img
          src={product.image_url}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>
      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{product.title}</h3>
      <div className="mt-2">
        <Rating value={Number(product.rating)} count={product.rating_count} />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-semibold">{inr(Number(product.price))}</span>
        {off > 0 ? (
          <>
            <span className="text-sm text-muted-foreground line-through">{inr(Number(product.mrp))}</span>
            <span className="text-sm font-semibold text-[var(--deal)]">{off}% off</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
