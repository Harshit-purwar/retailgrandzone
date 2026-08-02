import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedStore, scopeToStore } from "@/lib/stores";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "All products — The Grand Zone" },
      { name: "description", content: "Browse every product on The Grand Zone by category, brand and price." },
      { property: "og:title", content: "All products — The Grand Zone" },
      { property: "og:description", content: "Browse every product on The Grand Zone by category, brand and price." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, category } = Route.useSearch();
  const { store } = useSelectedStore();
  const storeId = store?.id ?? null;

  const products = useQuery({
    queryKey: ["products", "list", q ?? "", category ?? "", storeId ?? ""],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("active", true);
      if (category) query = query.eq("category", category);
      query = scopeToStore(query, storeId);
      if (q) query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const list = products.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="rounded-lg bg-card p-4">
        <h1 className="text-xl font-semibold">
          {category ? category : q ? `Results for "${q}"` : "All products"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{list.length} items</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.isLoading
            ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)
            : list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!products.isLoading && list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No products matched your search.</p>
            <Link
              to="/products"
              search={{ q: undefined, category: undefined }}
              className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Clear filters
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
