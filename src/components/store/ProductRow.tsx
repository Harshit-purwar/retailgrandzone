import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  title: string;
  products: Product[];
  loading?: boolean;
  seeAll?: { category?: string; brand?: string };
};

/** Horizontally scrolling product carousel used across the storefront. */
export function ProductRow({ title, products, loading, seeAll }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  }

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl bg-card p-3 sm:mt-5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAll ? (
            seeAll.brand ? (
              <Link
                to="/brand/$brand"
                params={{ brand: seeAll.brand }}
                className="text-xs font-bold text-primary hover:underline sm:text-sm"
              >
                See all
              </Link>
            ) : (
              <Link
                to="/products"
                search={{ q: undefined, category: seeAll.category }}
                className="text-xs font-bold text-primary hover:underline sm:text-sm"
              >
                See all
              </Link>
            )
          ) : null}
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => scroll(-1)}
              className="rounded-full border border-border bg-background p-1.5 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => scroll(1)}
              className="rounded-full border border-border bg-background p-1.5 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex snap-x gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-[46%] shrink-0 rounded-2xl sm:w-56" />
            ))
          : products.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-56 lg:w-60">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
    </section>
  );
}
