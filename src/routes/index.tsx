import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Banner, Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShopKart — Online Shopping for Mobiles, Fashion & Appliances" },
      {
        name: "description",
        content: "Browse the latest deals on mobiles, laptops, audio, fashion, footwear and home appliances at ShopKart.",
      },
      { property: "og:title", content: "ShopKart — Online Shopping" },
      { property: "og:description", content: "Deals on mobiles, laptops, audio, fashion and appliances." },
    ],
  }),
  component: Home,
});

function useBanners(placement: string) {
  return useQuery({
    queryKey: ["banners", placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .eq("placement", placement)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Banner[];
    },
  });
}

function bannerTarget(banner: Banner) {
  if (banner.product_id) return { to: "/product/$slug", params: { slug: banner.product_id } } as const;
  return {
    to: "/products",
    search: { q: undefined, category: banner.link_category ?? undefined },
  } as const;
}

function Home() {
  const navigate = useNavigate();
  const hero = useBanners("hero");
  const promo = useBanners("promo");

  const products = useQuery({
    queryKey: ["products", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const list = products.data ?? [];
  const deals = [...list].sort((a, b) => Number(b.mrp) - Number(b.price) - (Number(a.mrp) - Number(a.price))).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <h1 className="sr-only">ShopKart online shopping</h1>

      {/* Hero banners */}
      <section className="space-y-3">
        {hero.isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : null}
        {(hero.data ?? []).map((b) => {
          const target = bannerTarget(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(target as never)}
              className="relative block w-full overflow-hidden rounded-lg text-left"
            >
              <img src={b.image_url} alt={b.title} className="h-48 w-full object-cover sm:h-72" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent p-6 sm:p-10">
                <div className="max-w-md text-white">
                  <h2 className="text-2xl font-bold sm:text-4xl">{b.title}</h2>
                  <p className="mt-2 text-sm opacity-90 sm:text-base">{b.subtitle}</p>
                  <span className="mt-4 inline-block rounded bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)]">
                    {b.cta_text}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Deals */}
      <section className="mt-6 rounded-lg bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Deals of the day</h2>
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)
            : deals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Promo banners */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {(promo.data ?? []).map((b) => {
          const target = bannerTarget(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(target as never)}
              className="relative overflow-hidden rounded-lg text-left"
            >
              <img src={b.image_url} alt={b.title} className="h-40 w-full object-cover" />
              <div className="absolute inset-0 bg-black/45 p-5 text-white">
                <h3 className="text-lg font-semibold">{b.title}</h3>
                <p className="text-sm opacity-90">{b.subtitle}</p>
                <span className="mt-3 inline-block text-sm font-semibold underline">{b.cta_text}</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* All products */}
      <section className="mt-6 rounded-lg bg-card p-4">
        <h2 className="mb-4 text-xl font-semibold">Recommended for you</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
