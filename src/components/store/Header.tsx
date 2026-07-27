import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingCart, User, Search, Package, LayoutDashboard, LogOut } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = ["Mobiles", "Laptops", "Audio", "Fashion", "Footwear", "Appliances", "Televisions", "Kitchen", "Bags", "Wearables"];

export function Header() {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
        <Link to="/" className="mr-2 flex flex-col leading-none">
          <span className="text-xl font-bold italic">ShopKart</span>
          <span className="text-[10px] italic opacity-80">Explore Plus</span>
        </Link>

        <form
          className="order-3 flex w-full flex-1 items-center rounded bg-white px-3 py-2 md:order-2 md:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/products", search: { q: term || undefined, category: undefined } });
          }}
        >
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for products, brands and more"
            aria-label="Search products"
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        </form>

        <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
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
              variant="secondary"
              className="bg-white font-semibold text-primary hover:bg-white/90"
              onClick={() => navigate({ to: "/auth", search: { redirect: undefined } })}
            >
              Login
            </Button>
          )}

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium hover:bg-white/15"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 ? (
              <span className="absolute -right-0 top-0 rounded-full bg-[var(--gold)] px-1.5 text-[10px] font-bold text-[var(--gold-foreground)]">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <nav className="border-t border-white/15 bg-primary/95">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-2 text-sm">
          <Link to="/products" search={{ q: undefined, category: undefined }} className="whitespace-nowrap hover:underline">
            All products
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to="/products"
              search={{ q: undefined, category: c }}
              className="whitespace-nowrap opacity-90 hover:underline"
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
    <footer className="mt-12 bg-[oklch(0.25_0.03_260)] py-10 text-sm text-white/70">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-white/50">About</p>
          <p>ShopKart is a demo marketplace built on Lovable with products, banners and orders managed from the admin panel.</p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-white/50">Help</p>
          <p>Payments · Shipping · Cancellation &amp; Returns · FAQ</p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-white/50">Shop</p>
          <Link to="/products" search={{ q: undefined, category: undefined }} className="hover:underline">
            Browse all products
          </Link>
        </div>
      </div>
    </footer>
  );
}
