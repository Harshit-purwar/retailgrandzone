import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingCart,
  User,
  Search,
  Package,
  LayoutDashboard,
  LogOut,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/categories";
import { inr } from "@/lib/store-types";
import logo from "@/assets/grandzone-logo.png.asset.json";
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

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo.url}
              alt="The Grand Zone logo"
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">
              The Grand Zone
            </span>
          </Link>


          <button
            type="button"
            className="hidden items-center gap-1 rounded-lg px-2 py-1 text-left text-sm hover:bg-black/5 md:flex"
          >
            <MapPin className="h-4 w-4" />
            <span>
              <span className="block font-bold leading-tight">Delivery in 12 minutes</span>
              <span className="block text-xs leading-tight opacity-80">Home · Sector 22, New Delhi</span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <div className="order-3 flex w-full basis-full shrink-0 items-center md:order-2 md:w-auto md:flex-1 md:basis-auto md:max-w-2xl">
            <form
              className="flex w-full items-center rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/products", search: { q: term || undefined, category: undefined } });
              }}
            >
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder='Search "smart watch"'
                aria-label="Search products"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </form>
          </div>

          <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-brand-foreground hover:bg-black/5">
                    <User className="mr-1 h-4 w-4" />
                    Account
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
                className="font-semibold text-brand-foreground hover:bg-black/5"
                onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
              >
                Login
              </Button>
            )}

            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 ? (
                <span className="leading-tight">
                  <span className="block text-xs">{count} items</span>
                  <span className="block">{inr(subtotal)}</span>
                </span>
              ) : (
                <span>My Cart</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2.5 text-sm font-medium">
          <Link
            to="/products"
            search={{ q: undefined, category: undefined }}
            className="whitespace-nowrap text-foreground hover:text-primary"
          >
            All products
          </Link>
          {(categories.data ?? []).map((c: string) => (
            <Link
              key={c}
              to="/products"
              search={{ q: undefined, category: c }}
              className="whitespace-nowrap text-muted-foreground hover:text-primary"
            >
              {c}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-card py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground">About</p>
          <p>The Grand Zone delivers everyday essentials and gadgets to your door in minutes.</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground">Help</p>
          <p>Payments · Shipping · Cancellation &amp; Returns · FAQ</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-foreground">Shop</p>
          <Link to="/products" search={{ q: undefined, category: undefined }} className="hover:text-primary">
            Browse all products
          </Link>
        </div>
      </div>
    </footer>
  );
}
