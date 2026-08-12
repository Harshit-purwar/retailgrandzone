import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist, toggleWishlist } from "@/lib/wishlist";
import { useMemo } from "react";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Your wishlist — The Grand Zone" },
      { name: "description", content: "Products you have saved on The Grand Zone." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const ids = useWishlist();

  const products = useQuery({
    enabled: ids.length > 0,
    queryKey: ["wishlist", ids.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Product[];
      return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Product[];
    },
  });

  const list = useMemo(() => products.data ?? [], [products.data]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <div className="rounded-lg bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            Your wishlist
          </h1>
          {list.length > 0 ? (
            <button
              type="button"
              onClick={() => ids.forEach((id) => toggleWishlist(id))}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          ) : null}
        </div>

        {ids.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Your wishlist is empty.</p>
            <Link
              to="/products"
              search={{ q: undefined, category: undefined }}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {products.isLoading
              ? Array.from({ length: Math.min(ids.length, 10) }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-lg" />
                ))
              : list.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {!products.isLoading && ids.length > 0 && list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            These items are no longer available for sale.
          </p>
        ) : null}
      </div>
    </div>
  );
}
