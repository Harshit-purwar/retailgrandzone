import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Banner, Product } from "@/lib/store-types";
import { useCategories } from "@/lib/categories";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Smartphone,
  Laptop,
  Headphones,
  Shirt,
  Footprints,
  WashingMachine,
  Tv,
  CookingPot,
  Backpack,
  Watch,
  Tag,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Mobiles: Smartphone,
  Laptops: Laptop,
  Audio: Headphones,
  Fashion: Shirt,
  Footwear: Footprints,
  Appliances: WashingMachine,
  Televisions: Tv,
  Kitchen: CookingPot,
  Bags: Backpack,
  Wearables: Watch,
};


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
      <h1 className="sr-only">The Grand Zone online shopping</h1>

      {/* Hero banners — scrollable image carousel */}
      <section>
        {hero.isLoading ? <Skeleton className="h-56 w-full rounded-2xl" /> : null}
        {(hero.data ?? []).length > 0 ? (
          <div className="relative">
            <div
              ref={heroScroller}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    <img src={b.image_url} alt={b.title} className="h-48 w-full object-cover sm:h-72" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent p-6 sm:p-10">
                      <div className="max-w-md text-white">
                        <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-foreground">
                          Delivery in 12 minutes
                        </span>
                        <h2 className="mt-3 text-2xl font-bold sm:text-4xl">{b.title}</h2>
                        <p className="mt-2 text-sm opacity-90 sm:text-base">{b.subtitle}</p>
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

      {/* Category tiles */}
      <section className="mt-5 rounded-2xl bg-card p-4">
        <h2 className="mb-3 text-lg font-bold">Shop by category</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {(categories.data ?? []).map((name: string) => {
            const Icon = CATEGORY_ICONS[name] ?? Tag;
            return (
              <Link
                key={name}
                to="/products"
                search={{ q: undefined, category: name }}
                className="flex flex-col items-center gap-2 rounded-xl bg-secondary p-2 text-center transition-colors hover:bg-accent"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-[11px] font-semibold leading-tight text-foreground">{name}</span>
              </Link>
            );
          })}
        </div>
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


      {/* Promo banners */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        {(promo.data ?? []).map((b) => {
          const target = bannerTarget(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(target as never)}
              className="relative overflow-hidden rounded-2xl text-left"
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
