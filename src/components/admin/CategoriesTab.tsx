import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedCategories, type Category } from "@/lib/categories";
import { uploadStoreImage } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Draft = { id?: string; name: string; image_url: string; sort_order: number; active: boolean; oldName?: string };

const emptyDraft: Draft = { name: "", image_url: "", sort_order: 0, active: true };

export function CategoriesTab() {
  const qc = useQueryClient();
  const categories = useManagedCategories();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  }

  async function save() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return toast.error("Category name is required");
    setBusy(true);
    const payload = {
      name,
      image_url: draft.image_url.trim() || null,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active,
    };
    const res = draft.id
      ? await supabase.from("categories").update(payload as never).eq("id", draft.id)
      : await supabase.from("categories").insert(payload as never);
    if (res.error) {
      setBusy(false);
      return toast.error(res.error.message);
    }

    // Keep existing products linked when a category is renamed.
    if (draft.id && draft.oldName && draft.oldName !== name) {
      await supabase.from("products").update({ category: name } as never).eq("category", draft.oldName);
    }
    setBusy(false);
    setDraft(null);
    toast.success("Category saved");
    refresh();
  }

  async function remove(row: Category) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category", row.name);
    if (count && count > 0) {
      return toast.error(`${count} product(s) still use "${row.name}". Move them first or disable the category.`);
    }
    const { error } = await supabase.from("categories").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    refresh();
  }

  async function toggle(row: Category, active: boolean) {
    const { error } = await supabase.from("categories").update({ active } as never).eq("id", row.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div>
      <Button className="mb-3" onClick={() => setDraft({ ...emptyDraft })}>
        <Plus className="mr-1 h-4 w-4" /> New category
      </Button>

      <div className="space-y-2">
        {(categories.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No categories yet.</p>
        ) : null}
        {(categories.data ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3 text-sm">
            {c.image_url ? (
              <img src={c.image_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted" />
            )}
            <div className="flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground">Order {c.sort_order}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              {c.active ? "Enabled" : "Disabled"}
              <Switch checked={c.active} onCheckedChange={(v) => toggle(c, v)} />
            </label>
            <Button
              size="sm"
              variant="outline"
              aria-label={`Edit ${c.name}`}
              onClick={() =>
                setDraft({
                  id: c.id,
                  name: c.name,
                  oldName: c.name,
                  image_url: c.image_url ?? "",
                  sort_order: c.sort_order,
                  active: c.active,
                })
              }
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" aria-label={`Delete ${c.name}`} onClick={() => remove(c)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div>
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cat-order">Display order</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={String(draft.sort_order)}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Image (optional)</Label>
                <CategoryImageField
                  value={draft.image_url}
                  onChange={(v) => setDraft({ ...draft, image_url: v })}
                />
              </div>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3 text-sm">
                <span>Show this category on the store</span>
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadStoreImage(file));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {value ? <img src={value} alt="Category" className="h-14 w-14 rounded-lg border border-border object-cover" /> : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Choose file"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      <Input placeholder="…or paste an image URL" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
