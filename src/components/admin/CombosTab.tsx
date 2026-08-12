import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Combo, Product } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { comboNormalTotal } from "@/lib/combos";
import { ProductPicker } from "@/components/admin/ProductPicker";
import { ImageManager } from "@/components/admin/ImageManager";
import { StoreField } from "@/components/admin/StoresTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ComboRow = Record<string, unknown>;

const emptyCombo: ComboRow = {
  name: "",
  description: "",
  image_url: "",
  product_ids: [] as string[],
  combo_price: 0,
  store_id: "",
  active: true,
};

export function CombosTab({ onDeleted }: { onDeleted?: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ComboRow | null>(null);

  const combos = useQuery({
    queryKey: ["admin", "combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("combos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Combo[];
    },
  });

  const products = useQuery({
    queryKey: ["admin", "combos-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,title,price,active,stock");
      if (error) throw error;
      return (data ?? []) as unknown as Pick<
        Product,
        "id" | "title" | "price" | "active" | "stock"
      >[];
    },
  });

  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));

  async function saveCombo(row: ComboRow) {
    const ids = Array.isArray(row.product_ids) ? (row.product_ids as string[]).filter(Boolean) : [];
    if (!String(row.name ?? "").trim()) return toast.error("Combo name is required");
    if (ids.length === 0) return toast.error("Select at least one product for the combo");
    const price = Number(row.combo_price) || 0;
    if (price <= 0) return toast.error("Set a combo price above ₹0");

    const payload = {
      name: String(row.name).trim(),
      description: String(row.description ?? ""),
      image_url: String(row.image_url ?? ""),
      product_ids: ids,
      combo_price: price,
      store_id: row.store_id ? String(row.store_id) : null,
      active: !!row.active,
    };

    const res = row.id
      ? await supabase
          .from("combos")
          .update(payload as never)
          .eq("id", row.id as string)
      : await supabase.from("combos").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success(row.id ? "Combo updated" : "Combo created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "combos"] });
    qc.invalidateQueries({ queryKey: ["combos"] });
  }

  async function removeCombo(id: string) {
    if (!window.confirm("Delete this combo offer? Existing orders are kept.")) return;
    const { error } = await supabase.from("combos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Combo deleted");
    qc.invalidateQueries({ queryKey: ["admin", "combos"] });
    qc.invalidateQueries({ queryKey: ["combos"] });
    onDeleted?.();
  }

  return (
    <div>
      <Button className="mb-3" onClick={() => setEditing({ ...emptyCombo, product_ids: [] })}>
        <Plus className="mr-1 h-4 w-4" /> New combo
      </Button>

      {combos.isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading combos…</p>
      ) : (combos.data ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No combo offers yet. Create one to bundle products at a special price.
        </p>
      ) : (
        <div className="space-y-2">
          {(combos.data ?? []).map((c) => {
            const ids = comboProductIds(c);
            const included = ids.map((id) => byId.get(id)).filter(Boolean) as Pick<
              Product,
              "id" | "title" | "price" | "active" | "stock"
            >[];
            const normal = comboNormalTotal(included as never as Product[]);
            const savings = Math.max(0, normal - Number(c.combo_price));
            const unavailable =
              included.length < ids.length ||
              included.some((p) => !p.active || Number(p.stock) <= 0);
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded border border-border p-3"
              >
                <img src={c.image_url} alt={c.name} className="h-12 w-16 rounded object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {c.name}
                    {!c.active ? (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        DISABLED
                      </span>
                    ) : null}
                    {unavailable ? (
                      <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                        NEEDS STOCK
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground">
                    {included.map((p) => p.title).join(", ") || "No products"}
                  </p>
                  <p className="text-muted-foreground">
                    Normal {inr(normal)} · Combo{" "}
                    <span className="font-semibold text-[var(--deal)]">
                      {inr(Number(c.combo_price))}
                    </span>
                    {savings > 0 ? ` · Save ${inr(savings)}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      ...(c as unknown as ComboRow),
                      product_ids: comboProductIds(c),
                      store_id: c.store_id ?? "",
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeCombo(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit combo" : "New combo"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <ComboForm
              row={editing}
              onChange={setEditing}
              onSave={() => saveCombo(editing)}
              products={products.data ?? []}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComboForm({
  row,
  onChange,
  onSave,
  products,
}: {
  row: ComboRow;
  onChange: (row: ComboRow) => void;
  onSave: () => void;
  products: Pick<Product, "id" | "title" | "price" | "active" | "stock">[];
}) {
  const ids = Array.isArray(row.product_ids) ? (row.product_ids as string[]) : [];
  const included = ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Pick<Product, "id" | "title" | "price" | "active" | "stock"> => !!p);
  const normal = comboNormalTotal(included as never as Product[]);
  const price = Number(row.combo_price) || 0;
  const savings = Math.max(0, normal - price);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor="combo-name">Combo name</Label>
        <Input
          id="combo-name"
          value={String(row.name ?? "")}
          onChange={(e) => onChange({ ...row, name: e.target.value })}
          placeholder="e.g. Iron + Power Bank Combo"
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Combo image</Label>
        <ImageManager
          kind="banner"
          value={String(row.image_url ?? "") ? [String(row.image_url)] : []}
          onChange={(v) => onChange({ ...row, image_url: v[0] ?? "" })}
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="combo-desc">Combo description</Label>
        <Textarea
          id="combo-desc"
          rows={2}
          value={String(row.description ?? "")}
          onChange={(e) => onChange({ ...row, description: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Products in this combo</Label>
        <ProductPicker
          context="this combo"
          value={ids}
          onChange={(v) => onChange({ ...row, product_ids: v })}
        />
      </div>

      <div>
        <Label htmlFor="combo-price">Combo price (₹)</Label>
        <Input
          id="combo-price"
          type="number"
          min={0}
          step="any"
          value={String(row.combo_price ?? "")}
          onChange={(e) => onChange({ ...row, combo_price: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label>Normal total</Label>
        <p className="rounded border border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
          {inr(normal)}
        </p>
      </div>

      <div>
        <Label>Savings</Label>
        <p className="rounded border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-[var(--deal)]">
          {savings > 0 ? `You save ${inr(savings)}` : "—"}
        </p>
      </div>

      <div>
        <Label>Store (optional)</Label>
        <StoreField
          value={String(row.store_id ?? "")}
          onChange={(v) => onChange({ ...row, store_id: v })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={!!row.active}
          onChange={(e) => onChange({ ...row, active: e.target.checked })}
        />
        Visible on the store
      </label>

      <div className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--deal)]" />
        Original product prices are never changed — the combo price applies only when this bundle is
        purchased.
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" className="w-full sm:w-auto">
          Save combo
        </Button>
      </div>
    </form>
  );
}

function comboProductIds(combo: { product_ids: unknown }): string[] {
  if (!Array.isArray(combo.product_ids)) return [];
  return combo.product_ids.map(String).filter(Boolean);
}
