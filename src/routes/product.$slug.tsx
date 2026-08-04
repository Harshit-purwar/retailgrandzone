import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { discountPercent, inr, toList, toSpecs } from "@/lib/store-types";
import { Rating } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { ProductRow } from "@/components/store/ProductRow";
import { recordRecentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";
import { useEffect } from "react";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product details — The Grand Zone" },
      { name: "description", content: "Full description, ratings and specifications for this The Grand Zone product." },
      { property: "og:title", content: "Product details — The Grand Zone" },
      { property: "og:description", content: "Full description, ratings and specifications for this The Grand Zone product." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(slug);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq(isUuid ? "id" : "slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Product | null;
    },
  });

  const product = productQuery.data;

  const related = useQuery({
    enabled: !!product,
    queryKey: ["related", product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .or(`category.eq.${product!.category},brand.eq.${product!.brand}`)
        .neq("id", product!.id)
        .limit(12);
      if (error) throw error;
      let rows = (data ?? []) as unknown as Product[];
      if (rows.length === 0) {
        const fallback = await supabase.from("products").select("*").eq("active", true).neq("id", product!.id).limit(12);
        rows = (fallback.data ?? []) as unknown as Product[];
      }
      return rows;
    },
  });

  const recentIds = useRecentlyViewed().filter((id) => id !== product?.id);

  const recentlyViewed = useQuery({
    enabled: recentIds.length > 0,
    queryKey: ["recently-viewed", recentIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").in("id", recentIds).eq("active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Product[];
      return recentIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Product[];
    },
  });

  useEffect(() => {
    if (product?.id) recordRecentlyViewed(product.id);
  }, [product?.id]);

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link
          to="/products"
          search={{ q: undefined, category: undefined }}
          className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const off = discountPercent(Number(product.price), Number(product.mrp));
  const highlights = toList(product.highlights);
  const specs = toSpecs(product.specs);
  const gallery = [product.image_url, ...toList(product.images)].filter(Boolean);

  const outOfStock = Number(product.stock) <= 0;

  const line = {
    productId: product.id,
    title: product.title,
    image_url: product.image_url,
    price: Number(product.price),
    slug: product.slug,
    stock: product.stock,
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <Link to="/products" search={{ q: undefined, category: product.category }} className="hover:underline">
          {product.category}
        </Link>
        {" / "}
        <span>{product.title}</span>
      </nav>

      <div className="grid gap-6 rounded-lg bg-card p-3 sm:p-4 lg:grid-cols-[420px_1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded border border-border bg-white p-3 sm:p-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  id={`gallery-${i}`}
                  src={src}
                  alt={`${product.title} image ${i + 1}`}
                  className="mx-auto h-64 w-full shrink-0 snap-center object-contain sm:h-80"
                />
              ))}
            </div>
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {gallery.map((src, i) => (
                <button
                  key={`thumb-${src}-${i}`}
                  type="button"
                  onClick={() =>
                    document.getElementById(`gallery-${i}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
                  }
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-white"
                >
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              size="lg"
              disabled={outOfStock}
              className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
              onClick={() => {
                cart.add(line);
                toast.success("Added to cart");
              }}
            >
              {outOfStock ? "Sold out" : "Add to cart"}
            </Button>
            <Button
              size="lg"
              disabled={outOfStock}
              onClick={() => {
                cart.add(line);
                navigate({ to: "/checkout" });
              }}
            >
              Buy now
            </Button>
          </div>
        </div>

        <div>
          <Link
            to="/brand/$brand"
            params={{ brand: product.brand }}
            className="text-sm font-medium text-primary hover:underline"
          >
            {product.brand}
          </Link>
          <h1 className="text-xl font-semibold sm:text-2xl">{product.title}</h1>
          <div className="mt-2">
            <Rating value={Number(product.rating)} count={product.rating_count} />
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{inr(Number(product.price))}</span>
            {off > 0 ? (
              <>
                <span className="text-lg text-muted-foreground line-through">{inr(Number(product.mrp))}</span>
                <span className="text-lg font-semibold text-[var(--deal)]">{off}% off</span>
              </>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--deal)]">
            {outOfStock
              ? "Currently out of stock"
              : product.stock <= 5
                ? `Hurry, only ${product.stock} left in stock`
                : "In stock"}
          </p>

          {highlights.length > 0 ? (
            <div className="mt-5">
              <h2 className="mb-2 font-semibold">Highlights</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                {highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5">
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{product.description}</p>
          </div>

          {specs.length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold">Specifications</h2>
              <div className="overflow-hidden rounded border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([k, v], i) => (
                      <tr key={k} className={i % 2 ? "bg-muted/40" : ""}>
                        <td className="w-32 px-3 py-2 align-top text-muted-foreground sm:w-48">{k}</td>
                        <td className="px-3 py-2">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <span className="flex items-center gap-2 rounded border border-border p-3">
              <Truck className="h-4 w-4 text-primary" /> Free delivery
            </span>
            <span className="flex items-center gap-2 rounded border border-border p-3">
              <RotateCcw className="h-4 w-4 text-primary" /> 7 day replacement
            </span>
            <span className="flex items-center gap-2 rounded border border-border p-3">
              <ShieldCheck className="h-4 w-4 text-primary" /> Warranty included
            </span>
          </div>
        </div>
      </div>

      <ProductRow
        title="Similar products"
        products={related.data ?? []}
        seeAll={{ category: product.category }}
      />

      <ProductRow
        title={`More from ${product.brand}`}
        products={(related.data ?? []).filter((p) => p.brand === product.brand)}
        seeAll={{ brand: product.brand }}
      />

      <ProductRow title="Recently viewed" products={recentlyViewed.data ?? []} />
    </div>
  );
}
