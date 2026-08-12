import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Minus, ShoppingCart, Sparkles } from "lucide-react";
import type { Product } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import {
  useCombo,
  useComboProducts,
  comboProductIds,
  comboAvailable,
  comboNormalTotal,
  comboMaxStock,
} from "@/lib/combos";

export const Route = createFileRoute("/combo/$id")({
  head: () => ({
    meta: [
      { title: "Combo offer — The Grand Zone" },
      {
        name: "description",
        content:
          "Bundle your favourite products together and save with The Grand Zone combo offers.",
      },
      { property: "og:title", content: "Combo offer — The Grand Zone" },
      {
        property: "og:description",
        content: "Bundle products together and save with The Grand Zone combo offers.",
      },
    ],
  }),
  component: ComboPage,
});

function ComboPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const comboQuery = useCombo(id);
  const combo = comboQuery.data;

  const ids = comboProductIds(combo ?? { product_ids: [] });
  const productsQuery = useComboProducts(ids);
  const products = productsQuery.data ?? [];

  const available = comboAvailable(products);
  const normalTotal = comboNormalTotal(products);
  const comboPrice = Number(combo?.combo_price ?? 0);
  const savings = Math.max(0, normalTotal - comboPrice);
  const savingsPct = normalTotal > 0 ? Math.round((savings / normalTotal) * 100) : 0;
  const maxStock = comboMaxStock(products);

  if (comboQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!combo || !combo.active) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Combo offer not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This combo offer is no longer available.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const addCombo = (goToCheckout: boolean) => {
    if (!available || maxStock <= 0) {
      toast.error("This combo is currently unavailable");
      return;
    }
    cart.add(
      {
        productId: combo.id,
        kind: "combo",
        comboItems: products.map((p) => ({ id: p.id, title: p.title })),
        title: combo.name,
        image_url: combo.image_url,
        price: comboPrice,
        slug: null,
        stock: maxStock,
      },
      1,
    );
    toast.success(`${combo.name} added at ${inr(comboPrice)}`);
    if (goToCheckout) navigate({ to: "/checkout" });
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="font-medium text-foreground">{combo.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
        {/* Combo image */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          {combo.image_url ? (
            <img
              src={combo.image_url}
              alt={combo.name}
              className="aspect-square w-full bg-white object-contain"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground">
              No image
            </div>
          )}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--deal)] px-2.5 py-1 text-xs font-bold text-white">
            <Sparkles className="h-3.5 w-3.5" /> Combo deal
          </span>
          {savings > 0 ? (
            <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
              Save {inr(savings)}
            </span>
          ) : null}
        </div>

        {/* Combo details */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Combo offer
          </span>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{combo.name}</h1>

          {combo.description ? (
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{combo.description}</p>
          ) : null}

          {/* Price block */}
          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-[var(--deal)]">{inr(comboPrice)}</span>
            {normalTotal > comboPrice ? (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {inr(normalTotal)}
                </span>
                <span className="rounded-full bg-[var(--deal)]/10 px-2 py-0.5 text-sm font-bold text-[var(--deal)]">
                  {savingsPct}% off
                </span>
              </>
            ) : null}
          </div>

          {/* Normal vs combo vs savings summary */}
          <div className="mt-5 max-w-sm space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Normal total</span>
              <span className="font-medium line-through">{inr(normalTotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Combo price</span>
              <span className="text-base font-extrabold text-[var(--deal)]">{inr(comboPrice)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-dashed border-border pt-2">
              <span className="text-muted-foreground">You save</span>
              <span className="font-bold text-[var(--deal)]">{inr(savings)}</span>
            </div>
          </div>

          {/* Availability + add to cart */}
          {productsQuery.isLoading ? (
            <p className="mt-5 text-sm text-muted-foreground">Checking availability…</p>
          ) : !available ? (
            <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-semibold">Combo currently unavailable</p>
              <p className="mt-1">
                {products.some((p) => !p.active)
                  ? "One of the bundled products is no longer active."
                  : products.some((p) => Number(p.stock) <= 0)
                    ? "One of the bundled products is out of stock."
                    : "One of the bundled products could not be found."}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!available}
              className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90"
              onClick={() => addCombo(false)}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Add combo to cart
            </Button>
            <Button size="lg" disabled={!available} onClick={() => addCombo(true)}>
              Buy now
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {maxStock > 0 ? `You can buy up to ${maxStock} (limited by product stock).` : ""}
          </p>
        </div>
      </div>

      {/* Included products */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-base font-bold sm:text-xl">Included products</h2>
        {productsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : products.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <ComboProductRow key={p.id} product={p} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No products found in this combo.</p>
        )}
      </section>
    </div>
  );
}

function ComboProductRow({ product }: { product: Product }) {
  const inStock = Number(product.stock) > 0;
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-border p-3 ${
        !inStock ? "opacity-60" : ""
      }`}
    >
      <Link to="/product/$slug" params={{ slug: product.slug ?? product.id }} className="shrink-0">
        <img
          src={product.image_url}
          alt={product.title}
          loading="lazy"
          className="h-16 w-16 rounded-lg border border-border bg-white object-contain"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug ?? product.id }}
          className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary"
        >
          {product.title}
        </Link>
        <p className="mt-0.5 text-sm font-semibold">{inr(Number(product.price))}</p>
        <p className="text-xs text-muted-foreground">
          {inStock ? `${product.stock} in stock` : "Out of stock"}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          inStock ? "bg-[var(--deal)]/10 text-[var(--deal)]" : "bg-muted text-muted-foreground"
        }`}
      >
        {inStock ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {inStock ? "Included" : "Unavailable"}
      </span>
    </li>
  );
}
