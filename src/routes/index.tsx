import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner, Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSelectedStore, scopeToStore } from "@/lib/stores";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Grand Zone — Online Shopping for Mobiles, Fashion & Appliances" },
      {
        name: "description",
        content: "Browse the latest deals on mobiles, laptops, audio, fashion, footwear and home appliances at The Grand Zone.",
      },
      { property: "og:title", content: "The Grand Zone — Online Shopping" },
      { property: "og:description", content: "Deals on mobiles, laptops, audio, fashion and appliances." },
    ],
  }),
  component: Home,
});

function useBanners(placement: string, storeId: string | null) {
  return useQuery({
    queryKey: ["banners", placement, storeId ?? ""],
    queryFn: async () => {
      const base = supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .eq("placement", placement);
      const { data, error } = await scopeToStore(base, storeId).order("sort_order");
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
  const { store } = useSelectedStore();
  const storeId = store?.id ?? null;
  const hero = useBanners("hero", storeId);
  const heroScroller = useRef<HTMLDivElement>(null);

  function scrollHero(direction: 1 | -1) {
    const el = heroScroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  const promo = useBanners("promo", storeId);

  const products = useQuery({
    queryKey: ["products", "home", storeId ?? ""],
    queryFn: async () => {
      const base = supabase.from("products").select("*").eq("active", true);
      const { data, error } = await scopeToStore(base, storeId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const list = products.data ?? [];
  const deals = [...list].sort((a, b) => Number(b.mrp) - Number(b.price) - (Number(a.mrp) - Number(a.price))).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <h1 className="sr-only">The Grand Zone online shopping</h1>

      {/* Hero banners — scrollable carousel (Blinkit-style cards on mobile) */}
      <section className="-mx-4 sm:mx-0">
        {hero.isLoading ? <Skeleton className="mx-4 h-44 rounded-2xl sm:mx-0 sm:h-72" /> : null}
        {(hero.data ?? []).length > 0 ? (
          <div className="relative">
            {/* Mobile: compact swipeable tiles */}
            <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
              {(hero.data ?? []).map((b) => {
                const target = bannerTarget(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(target as never)}
                    className="relative w-[44%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm active:scale-[0.98]"
                  >
                    <img src={b.image_url} alt={b.title} className="aspect-[4/5] w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
                      Featured
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-white">
                      <p className="line-clamp-2 text-[13px] font-bold leading-tight">{b.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] opacity-85">{b.cta_text}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop: full-width banner carousel */}
            <div
              ref={heroScroller}
              className="hidden snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden"
            >
              {(hero.data ?? []).map((b) => {
                const target = bannerTarget(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(target as never)}
                    className="relative w-full shrink-0 snap-center overflow-hidden rounded-2xl text-left"
                  >
                    <img src={b.image_url} alt={b.title} className="h-72 w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent p-10">
                      <div className="max-w-md text-white">
                        <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-foreground">
                          Delivery in 12 minutes
                        </span>
                        <h2 className="mt-3 text-4xl font-bold">{b.title}</h2>
                        <p className="mt-2 text-base opacity-90">{b.subtitle}</p>
                        <span className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                          {b.cta_text}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {(hero.data ?? []).length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous banner"
                  onClick={() => scrollHero(-1)}
                  className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-md hover:bg-card sm:block"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next banner"
                  onClick={() => scrollHero(1)}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-md hover:bg-card sm:block"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </section>


      {/* Deals */}
      <section className="mt-5 rounded-2xl bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Deals of the day</h2>
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="text-sm font-bold text-primary hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
            : deals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>


      {/* Promo banners — horizontally scrollable */}
      <section className="-mx-4 mt-5 sm:mx-0">
        <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
          {(promo.data ?? []).map((b) => {
            const target = bannerTarget(b);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(target as never)}
                className="relative w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl text-left active:scale-[0.98] sm:w-[48%]"
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
        </div>
      </section>


      {/* All products */}
      <section className="mt-5 rounded-2xl bg-card p-4">
        <h2 className="mb-4 text-xl font-bold">Recommended for you</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
