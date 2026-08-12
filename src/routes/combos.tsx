import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { Combo, Product } from "@/lib/store-types";
import { useCombos, comboProductIds, fetchComboProducts } from "@/lib/combos";
import { useSelectedStore } from "@/lib/stores";
import { ComboCard } from "@/components/store/ComboCard";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/combos")({
  head: () => ({
    meta: [
      { title: "Combo offers — The Grand Zone" },
      {
        name: "description",
        content:
          "Bundle your favourite products together and save with The Grand Zone combo offers.",
      },
      { property: "og:title", content: "Combo offers — The Grand Zone" },
      {
        property: "og:description",
        content: "Bundle products together and save with The Grand Zone combo offers.",
      },
    ],
  }),
  component: CombosPage,
});

function CombosPage() {
  const { store } = useSelectedStore();
  const combosQuery = useCombos(store?.id ?? null);
  const combos = combosQuery.data ?? [];

  const ids = Array.from(new Set(combos.flatMap((c) => comboProductIds(c))));
  const productsQuery = useQuery({
    enabled: ids.length > 0,
    queryKey: ["combos-page-products", ids.join(",")],
    queryFn: () => fetchComboProducts(ids),
  });

  const byId = new Map((productsQuery.data ?? []).map((p) => [p.id, p]));
  const visible = combos
    .map((c) => ({
      combo: c,
      items: comboProductIds(c)
        .map((id) => byId.get(id))
        .filter((p): p is Product => !!p),
    }))
    .filter((r) => r.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4">
      <nav className="mb-3 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Home
        </Link>
        {" / "}
        <span className="font-medium text-foreground">Combo offers</span>
      </nav>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Combo offers</h1>
        <span className="text-xs font-medium text-muted-foreground">Bundle &amp; save</span>
      </div>

      {combosQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No combo offers are available right now. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map(({ combo, items }) => (
            <ComboCard key={combo.id} combo={combo} products={items} />
          ))}
        </div>
      )}
    </div>
  );
}
