import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { Input } from "@/components/ui/input";

/** Searchable multi-select of existing catalog products (used for combos & banners). */
export function ProductPicker({
  value,
  onChange,
  context = "this offer",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  context?: string;
}) {
  const [q, setQ] = useState("");
  const query = q.trim();

  const results = useQuery({
    queryKey: ["admin", "product-picker", query],
    queryFn: async () => {
      let base = supabase.from("products").select("id,title,price,stock,active");
      if (query) base = base.ilike("title", `%${query}%`);
      const { data, error } = await base.order("title").limit(query ? 20 : 100);
      if (error) throw error;
      return (data ?? []) as unknown as Pick<
        Product,
        "id" | "title" | "price" | "stock" | "active"
      >[];
    },
  });

  const selected = useQuery({
    enabled: value.length > 0,
    queryKey: ["admin", "product-picker-selected", value.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,price,stock,active")
        .in("id", value);
      if (error) throw error;
      return (data ?? []) as unknown as Pick<
        Product,
        "id" | "title" | "price" | "stock" | "active"
      >[];
    },
  });

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  const selectedItems = (selected.data ?? [])
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));
  const hits = (results.data ?? []).filter((p) => !value.includes(p.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {selectedItems.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Selected for {context}</p>
          <div className="space-y-1 rounded border border-border p-2 text-sm">
            {selectedItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {p.title}
                  {!p.active || Number(p.stock) <= 0 ? (
                    <span className="ml-1.5 rounded bg-destructive/10 px-1 py-0.5 text-[10px] font-bold text-destructive">
                      {!p.active ? "inactive" : "out of stock"}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${p.title}`}
                  onClick={() => toggle(p.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2 text-sm">
        {hits.map((p) => (
          <label key={p.id} className="flex items-center gap-2">
            <input type="checkbox" checked={value.includes(p.id)} onChange={() => toggle(p.id)} />
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {inrShort(Number(p.price))}
            </span>
          </label>
        ))}
        {!results.isLoading && hits.length === 0 && !query ? (
          <p className="p-2 text-xs text-muted-foreground">No products yet.</p>
        ) : null}
        {!results.isLoading && hits.length === 0 && query ? (
          <p className="p-2 text-xs text-muted-foreground">No products match “{query}”.</p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        These products are bundled together. The originals stay unchanged on the catalog.
      </p>
    </div>
  );
}

function inrShort(value: number): string {
  return "₹" + Math.round(value || 0).toLocaleString("en-IN");
}
