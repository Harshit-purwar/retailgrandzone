import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { inr } from "@/lib/store-types";
import { deliveryFeeFor, useStoreSettings } from "@/lib/store-settings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — The Grand Zone" },
      { name: "description", content: "Review the items in your The Grand Zone cart before placing your order." },
      { property: "og:title", content: "Your cart — The Grand Zone" },
      { property: "og:description", content: "Review the items in your The Grand Zone cart before placing your order." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const navigate = useNavigate();
  const settings = useStoreSettings();
  const delivery = deliveryFeeFor(subtotal, settings.data);


  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-lg bg-card p-10">
          <h1 className="text-xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add items to it now.</p>
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="mt-6 inline-block rounded bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
          >
            Shop now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-3 pb-28 pt-3 sm:px-4 sm:py-4 lg:grid-cols-[1fr_360px] lg:pb-8">
      <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
        <h1 className="border-b border-border px-4 py-3 text-base font-semibold sm:text-lg">
          My Cart ({lines.length})
        </h1>
        {lines.map((l) => (
          <div key={l.productId} className="flex gap-3 border-b border-border p-3 last:border-0 sm:gap-4 sm:p-4">
            <img
              src={l.image_url}
              alt={l.title}
              loading="lazy"
              className="h-20 w-20 shrink-0 rounded-xl bg-muted/40 object-contain sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <Link
                to="/product/$slug"
                params={{ slug: l.slug ?? l.productId }}
                className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary"
              >
                {l.title}
              </Link>
              <p className="mt-1 text-base font-semibold sm:text-lg">{inr(l.price)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-full border border-border">
                  <button
                    aria-label="Decrease quantity"
                    className="rounded-l-full px-3 py-1.5 transition-colors active:bg-muted"
                    onClick={() => setQuantity(l.productId, l.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{l.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    className="rounded-r-full px-3 py-1.5 transition-colors active:bg-muted"
                    onClick={() => setQuantity(l.productId, l.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => remove(l.productId)}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-2xl bg-card p-4 shadow-sm lg:sticky lg:top-32">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Price details</h2>
        <div className="space-y-2 border-b border-dashed border-border pb-3 text-sm">
          <div className="flex justify-between">
            <span>Price ({lines.length} items)</span>
            <span>{inr(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery charges</span>
            <span className={delivery ? "" : "text-[var(--deal)]"}>{delivery ? inr(delivery) : "FREE"}</span>
          </div>
        </div>
        <div className="flex justify-between py-3 text-base font-semibold">
          <span>Total amount</span>
          <span>{inr(subtotal + delivery)}</span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Have a coupon? Apply it at checkout.</p>
        <Button
          className="hidden w-full bg-[var(--gold)] text-[var(--gold-foreground)] transition-transform hover:bg-[var(--gold)]/90 active:scale-[0.99] lg:flex"
          size="lg"
          onClick={() => navigate({ to: "/checkout" })}
        >
          Place order
        </Button>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3">
          <div className="text-sm">
            <p className="font-semibold leading-tight">{inr(subtotal + delivery)}</p>
            <p className="text-xs leading-tight text-muted-foreground">{lines.length} items</p>
          </div>
          <Button
            className="ml-auto flex-1 bg-[var(--gold)] text-[var(--gold-foreground)] transition-transform hover:bg-[var(--gold)]/90 active:scale-[0.99]"
            size="lg"
            onClick={() => navigate({ to: "/checkout" })}
          >
            Place order
          </Button>
        </div>
      </div>
    </div>
  );
}

