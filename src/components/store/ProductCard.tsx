import { Link } from "@tanstack/react-router";
import { Star, Clock, Plus, Minus, Heart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/store-types";
import { discountPercent, inr } from "@/lib/store-types";
import { useCart } from "@/lib/cart-context";
import { useToggleWishlist, useWishlist } from "@/lib/wishlist";

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--deal)] px-1.5 py-0.5 text-xs font-semibold text-white">
        {Number(value).toFixed(1)}
        <Star className="h-3 w-3 fill-white" />
      </span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground">({count.toLocaleString("en-IN")})</span>
      ) : null}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(Number(product.price), Number(product.mrp));
  const { lines, add, setQuantity } = useCart();
  const line = lines.find((l) => l.productId === product.id);
  const outOfStock = Number(product.stock) <= 0;
  const atStockLimit = !!line && line.quantity >= Number(product.stock);
  const wishlisted = useWishlist().includes(product.id);
  const toggleWish = useToggleWishlist();

  function onToggleWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWish(product.id);
    toast.success(added ? "Added to wishlist" : "Removed from wishlist", {
      position: "bottom-center",
    });
  }

  const addToCart = () =>
    add({
      productId: product.id,
      title: product.title,
      image_url: product.image_url,
      price: Number(product.price),
      slug: product.slug ?? null,
      stock: product.stock,
    });

  /** ADD / quantity controls. `small` is the compact mobile variant. */
  const renderControls = (small: boolean) => {
    const icon = small ? "h-3 w-3" : "h-3.5 w-3.5";
    const btnPad = small ? "p-0.5" : "p-1";
    if (line) {
      return (
        <div
          className={`flex shrink-0 items-center gap-1 rounded-full bg-primary text-primary-foreground shadow-sm ${
            small ? "px-1 py-0.5" : "px-1.5 py-1"
          }`}
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity(product.id, line.quantity - 1)}
            className={btnPad}
          >
            <Minus className={icon} />
          </button>
          <span
            className={`text-center font-bold ${small ? "min-w-3 text-xs" : "min-w-4 text-sm"}`}
          >
            {line.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity(product.id, line.quantity + 1)}
            disabled={atStockLimit}
            className={`${btnPad} disabled:opacity-40`}
          >
            <Plus className={icon} />
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={addToCart}
        disabled={outOfStock}
        className={
          small
            ? "shrink-0 whitespace-nowrap rounded-full border border-primary bg-accent px-3 py-1 text-xs font-bold uppercase text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
            : "rounded-full border border-primary bg-accent px-5 py-1.5 text-sm font-bold uppercase text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
        }
      >
        {outOfStock ? "Sold out" : "Add"}
      </button>
    );
  };

  return (
    <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-3">
      <button
        type="button"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={onToggleWish}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1.5 shadow-sm backdrop-blur transition-transform active:scale-90"
      >
        <Heart
          className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-500"}`}
        />
      </button>
      {off > 0 ? (
        <span className="absolute left-0 top-3 z-10 rounded-r-md bg-[oklch(0.55_0.16_255)] px-2 py-0.5 text-[10px] font-bold text-white">
          {off}% OFF
        </span>
      ) : null}

      <Link to="/product/$slug" params={{ slug: product.slug ?? product.id }} className="block">
        <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-secondary sm:h-36">
          <img
            src={product.image_url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>

      {/* Mobile only: small ADD button right below the image, above the title */}
      <div className="mt-2 flex items-center justify-end gap-2 sm:hidden">
        {renderControls(true)}
      </div>

      <Link
        to="/product/$slug"
        params={{ slug: product.slug ?? product.id }}
        className="flex flex-1 flex-col"
      >
        <span className="mt-3 hidden w-fit items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground sm:inline-flex">
          <Clock className="h-3 w-3" /> 12 MINS
        </span>

        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-foreground sm:mt-1.5">
          {product.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
        <div className="mt-1 sm:mt-1.5">
          <Rating value={Number(product.rating)} count={product.rating_count} />
        </div>
      </Link>

      <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3">
        <div className="leading-tight">
          <span className="block text-base font-bold">{inr(Number(product.price))}</span>
          {off > 0 ? (
            <span className="block text-xs text-muted-foreground line-through">
              {inr(Number(product.mrp))}
            </span>
          ) : null}
        </div>

        <div className="hidden sm:block">{renderControls(false)}</div>
      </div>
    </div>
  );
}
