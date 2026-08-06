import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner, Product } from "@/lib/store-types";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductRow } from "@/components/store/ProductRow";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSelectedStore, scopeToStore } from "@/lib/stores";
import { useRecentlyViewed } from "@/lib/recently-viewed";


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
  const deals = [...list]
    .sort((a, b) => Number(b.mrp) - Number(b.price) - (Number(a.mrp) - Number(a.price)))
    .slice(0, 15);
  const newest = list.slice(0, 15);

  const categoryRows = Array.from(new Set(list.map((p) => p.category)))
    .map((category) => ({ category, items: list.filter((p) => p.category === category).slice(0, 15) }))
    .filter((row) => row.items.length > 0);

  const recentIds = useRecentlyViewed();
  const recentProducts = useQuery({
    enabled: recentIds.length > 0,
    queryKey: ["recently-viewed", "home", recentIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").in("id", recentIds).eq("active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Product[];
      return recentIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Product[];
    },
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <h1 className="sr-only">The Grand Zone online shopping</h1>

      {/* Hero banners — scrollable carousel (Blinkit-style cards on mobile) */}
      <section className="-mx-3 sm:mx-0">
        {hero.isLoading ? <Skeleton className="mx-4 aspect-[16/6] rounded-2xl sm:mx-0" /> : null}
        {(hero.data ?? []).length > 0 ? (
          <div className="relative">
            {/* Mobile: compact swipeable tiles */}
            <div className="flex snap-x gap-3 overflow-x-auto px-3 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
              {(hero.data ?? []).map((b) => {
                const target = bannerTarget(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(target as never)}
                    className="relative w-[44%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm active:scale-[0.98]"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                      <img
                        src={b.image_url}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
                      />
                      <img
                        src={b.image_url}
                        alt={b.title}
                        loading="lazy"
                        className="relative h-full w-full object-contain"
                      />
                    </div>
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
                    <div className="relative aspect-[16/6] w-full overflow-hidden bg-muted">
                      <img
                        src={b.image_url}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
                      />
                      <img
                        src={b.image_url}
                        alt={b.title}
                        className="relative h-full w-full object-contain"
                      />
                    </div>
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


      <ProductRow
        title="Deals of the day"
        products={deals}
        loading={products.isLoading}
        seeAll={{}}
      />

      <ProductRow title="Recently viewed" products={recentProducts.data ?? []} />

      <ProductRow title="Newest arrivals" products={newest} loading={products.isLoading} seeAll={{}} />

      {/* Promo banners — horizontally scrollable */}
      <section className="-mx-3 mt-4 sm:mx-0 sm:mt-5">
        <div className="flex snap-x gap-3 overflow-x-auto px-3 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
          {(promo.data ?? []).map((b) => {
            const target = bannerTarget(b);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(target as never)}
                className="relative w-[80%] shrink-0 snap-start overflow-hidden rounded-2xl text-left active:scale-[0.98] sm:w-[48%]"
              >
                <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
                  <img
                    src={b.image_url}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-60"
                  />
                  <img
                    src={b.image_url}
                    alt={b.title}
                    loading="lazy"
                    className="relative h-full w-full object-contain"
                  />
                </div>
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


      {categoryRows.map((row) => (
        <ProductRow key={row.category} title={row.category} products={row.items} seeAll={{ category: row.category }} />
      ))}

      <section className="mt-4 rounded-2xl bg-card p-3 sm:mt-5 sm:p-4">
        <h2 className="mb-3 text-base font-bold sm:text-xl">Recommended for you</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
