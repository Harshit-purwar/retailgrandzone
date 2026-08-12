import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist";

function NavItem({
  to,
  label,
  icon,
  badge,
  search,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  search?: Record<string, string | undefined>;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-primary aria-[current=page]:text-primary"
    >
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

/** Sticky mobile bottom navigation — hidden on sm+ screens. */
export function MobileNav() {
  const { user } = useAuth();
  const wishCount = useWishlist().length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-[600px] items-stretch px-2">
        <NavItem to="/" label="Home" icon={<Home className="h-5 w-5" />} />
        <NavItem to="/categories" label="Categories" icon={<LayoutGrid className="h-5 w-5" />} />
        <NavItem
          to="/wishlist"
          label="Wishlist"
          icon={<Heart className="h-5 w-5" />}
          badge={wishCount}
        />
        <NavItem to="/combos" label="Combos" icon={<Sparkles className="h-5 w-5" />} />
        <NavItem
          to={user ? "/orders" : "/auth"}
          label="Account"
          icon={<User className="h-5 w-5" />}
        />
      </div>
    </nav>
  );
}
