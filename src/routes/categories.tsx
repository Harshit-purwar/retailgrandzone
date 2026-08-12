import { createFileRoute, Link } from "@tanstack/react-router";
import { useCategories } from "@/lib/categories";
import { categoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by Category — The Grand Zone" },
      {
        name: "description",
        content:
          "Browse The Grand Zone by category — mobiles, laptops, audio, fashion, appliances and more.",
      },
      { property: "og:title", content: "Shop by Category — The Grand Zone" },
      {
        property: "og:description",
        content: "Browse The Grand Zone by category.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = useCategories();
  const items = (categories.data ?? []) as string[];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span>Shop by Category</span>
      </nav>

      <h1 className="text-xl font-bold sm:text-2xl">Shop by Category</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a category to see everything available in it.
      </p>

      {categories.isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No categories available yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((c) => {
            const Icon = categoryIcon(c);
            return (
              <Link
                key={c}
                to="/products"
                search={{ q: undefined, category: c }}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-muted to-secondary transition-transform group-hover:scale-105">
                  <Icon className="h-8 w-8 text-primary" />
                </span>
                <span className="text-sm font-semibold">{c}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
