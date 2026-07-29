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
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg bg-card">
        <h1 className="border-b border-border px-4 py-3 text-lg font-semibold">My Cart ({lines.length})</h1>
        {lines.map((l) => (
          <div key={l.productId} className="flex gap-4 border-b border-border p-4">
            <img src={l.image_url} alt={l.title} className="h-24 w-24 shrink-0 object-contain" />
            <div className="flex-1">
              <Link
                to="/product/$slug"
                params={{ slug: l.slug ?? l.productId }}
                className="text-sm font-medium hover:text-primary"
              >
                {l.title}
              </Link>
              <p className="mt-1 text-lg font-semibold">{inr(l.price)}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center rounded border border-border">
                  <button
                    aria-label="Decrease quantity"
                    className="px-2 py-1"
                    onClick={() => setQuantity(l.productId, l.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm">{l.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    className="px-2 py-1"
                    onClick={() => setQuantity(l.productId, l.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-destructive"
                  onClick={() => remove(l.productId)}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-lg bg-card p-4 lg:sticky lg:top-32">
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
        <Button className="w-full bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90" size="lg" onClick={() => navigate({ to: "/checkout" })}>
          Place order
        </Button>
      </aside>
    </div>
  );
}
