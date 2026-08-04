import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedStore, scopeToStore } from "@/lib/stores";

export const Route = createFileRoute("/brand/$brand")({
  head: ({ params }) => {
    const brand = decodeURIComponent(params.brand);
    return {
      meta: [
        { title: `${brand} products — The Grand Zone` },
        { name: "description", content: `Shop all ${brand} products available on The Grand Zone with fast local delivery.` },
        { property: "og:title", content: `${brand} products — The Grand Zone` },
        { property: "og:description", content: `Shop all ${brand} products on The Grand Zone.` },
      ],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { brand } = Route.useParams();
  const name = decodeURIComponent(brand);
  const { store } = useSelectedStore();
  const storeId = store?.id ?? null;

  const products = useQuery({
    queryKey: ["products", "brand", name, storeId ?? ""],
    queryFn: async () => {
      const base = supabase.from("products").select("*").eq("active", true).ilike("brand", name);
      const { data, error } = await scopeToStore(base, storeId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const list = products.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span>{name}</span>
      </nav>

      <div className="rounded-2xl bg-card p-3 sm:p-4">
        <h1 className="text-lg font-bold sm:text-xl">{name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {products.isLoading ? "Loading products…" : `${list.length} product${list.length === 1 ? "" : "s"}`}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.isLoading
            ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
            : list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!products.isLoading && list.length === 0 ? (
          <p className="py-14 text-center text-muted-foreground">No products from this brand yet.</p>
        ) : null}
      </div>
    </div>
  );
}
