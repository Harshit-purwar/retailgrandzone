import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useSavedLocation } from "@/lib/geo";
import { useSelectedStore } from "@/lib/stores";
import { StorePickerDialog } from "@/components/store/StoreGate";

import {
  ShoppingCart,
  User,
  Search,
  LayoutGrid,
  Clock,
  ShieldCheck,
  Package,
  LayoutDashboard,
  LogOut,
  MapPin,
  ChevronDown,
  Heart,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/categories";
import { categoryIcon } from "@/lib/category-icons";
import { inr } from "@/lib/store-types";
import { useWishlist } from "@/lib/wishlist";
import logo from "@/assets/grandzone-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { count, subtotal } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const categories = useCategories();
  const { location } = useSavedLocation();
  const { store } = useSelectedStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const wishCount = useWishlist().length;
  const place = store
    ? `${store.city} · ${location?.label ?? store.address ?? store.name}`
    : (location?.label ?? null);

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      <div className="bg-brand text-brand-foreground">
        <div className="mx-auto w-full max-w-[1600px] px-3 pb-2 pt-2.5 sm:px-4 sm:pb-3 sm:pt-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img
                src={logo}
                alt="The Grand Zone logo"
                className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10 sm:h-11 sm:w-11"
              />
              <span className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-tight sm:text-xl">
                  The Grand Zone
                </span>
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  Best deals
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="ml-4 hidden max-w-[16rem] items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-black/5 lg:flex"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">
                  {store ? `Delivery in ${store.delivery_estimate}` : "Select your location"}
                </span>
                <span className="block truncate text-xs leading-tight opacity-75">
                  {place ?? "Tap to choose a store"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Account"
                      className="h-10 w-10 rounded-full text-brand-foreground hover:bg-black/5 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3"
                    >
                      <User className="h-5 w-5 sm:mr-1 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                      <Package className="mr-2 h-4 w-4" /> My orders
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Admin panel
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await signOut();
                        navigate({ to: "/" });
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  className="h-10 px-3 font-semibold text-brand-foreground hover:bg-black/5"
                  onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
                >
                  Login
                </Button>
              )}

              <Link
                to="/wishlist"
                aria-label={`Wishlist${wishCount > 0 ? `, ${wishCount} items` : ""}`}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-brand-foreground transition-colors hover:bg-black/5 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3"
              >
                <Heart className="h-5 w-5 sm:mr-1 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Wishlist</span>
                {wishCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {wishCount}
                  </span>
                ) : null}
              </Link>

              <Link
                to="/cart"
                aria-label="Cart"
                className="relative inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-95 sm:rounded-xl sm:px-4"
              >
                <ShoppingCart className="h-5 w-5" />
                {count > 0 ? (
                  <>
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[11px] font-bold text-[var(--gold-foreground)] sm:hidden">
                      {count}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block text-xs">{count} items</span>
                      <span className="block">{inr(subtotal)}</span>
                    </span>
                  </>
                ) : (
                  <span className="hidden sm:inline">My Cart</span>
                )}
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-left text-xs transition-colors active:bg-black/10 lg:hidden"
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold leading-tight">
                {store ? `Delivery in ${store.delivery_estimate}` : "Select your location"}
              </span>
              <span className="block truncate leading-tight opacity-75">
                {place ?? "Tap to choose a store"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </button>

          <form
            className="mt-2 flex w-full items-center rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm transition-shadow focus-within:shadow-md sm:mt-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/products", search: { q: term || undefined, category: undefined } });
            }}
          >
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder='Search "smart watch"'
              aria-label="Search products"
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </form>
        </div>
      </div>

      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto px-3 py-2 text-sm font-medium [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            All products
          </Link>
          {(categories.data ?? []).map((c: string) => {
            const Icon = categoryIcon(c);
            return (
              <Link
                key={c}
                to="/products"
                search={{ q: undefined, category: c }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {c}
              </Link>
            );
          })}
        </div>
      </nav>

      <StorePickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </header>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-border bg-card pb-24 pt-8 text-sm text-muted-foreground">
      <div className="mx-auto w-full max-w-[1600px] px-4">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="The Grand Zone logo"
                className="h-9 w-9 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-extrabold text-foreground">The Grand Zone</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                  Best deals
                </p>
              </div>
            </div>
            <p className="mt-3 leading-relaxed">
              Everyday essentials, gadgets and fashion delivered to your door — genuine products,
              honest prices.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">Shop</p>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/products"
                  search={{ q: undefined, category: undefined }}
                  className="hover:text-primary"
                >
                  All products
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-primary">
                  Your cart
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-primary">
                  Your orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">Help</p>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/help" hash="request-help" className="hover:text-primary">
                  Request help
                </Link>
              </li>
              <li>
                <Link to="/policy" className="hover:text-primary">
                  Cancellation &amp; returns
                </Link>
              </li>
              <li>
                <Link to="/policy" hash="refunds" className="hover:text-primary">
                  Refund policy
                </Link>
              </li>
              <li>Shipping &amp; delivery</li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground">
              Contact
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                Support 9 AM – 9 PM, all days
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                100% secure payments
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} The Grand Zone. All rights reserved.</p>
          <p>Cash on Delivery · UPI · Cards · Netbanking</p>
        </div>
      </div>
    </footer>
  );
}
