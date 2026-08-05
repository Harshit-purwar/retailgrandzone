import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Link2, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BASE_CATEGORIES, useCategories } from "@/lib/categories";
import type { Product } from "@/lib/store-types";
import {
  generateProductDraft,
  importProductFromUrl,
  improveProductDraft,
  type ProductDraft,
} from "@/lib/ai-product.functions";
import { ImageManager } from "@/components/admin/ImageManager";
import { StoreField } from "@/components/admin/StoresTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AnyRecord = Record<string, unknown>;

const str = (row: AnyRecord, key: string) => String(row[key] ?? "");

/** Product editor with AI generation, URL import and full image management. */
export function ProductForm({
  row,
  onChange,
  onSave,
}: {
  row: AnyRecord;
  onChange: (row: AnyRecord) => void;
  onSave: () => void;
}) {
  const categories = useCategories();
  const list = categories.data ?? BASE_CATEGORIES;
  const [aiPrompt, setAiPrompt] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const allProducts = useQuery({
    queryKey: ["admin", "product-picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,title").order("title").limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Pick<Product, "id" | "title">[];
    },
  });

  const gallery = [str(row, "image_url"), ...(Array.isArray(row.images) ? (row.images as string[]) : [])].filter(Boolean);

  function setGallery(next: string[]) {
    onChange({ ...row, image_url: next[0] ?? "", images: next.slice(1) });
  }

  /** Blocks obvious duplicates before saving. */
  async function saveChecked() {
    const title = str(row, "title").trim();
    if (!title) return toast.error("Title is required");
    const slug = (str(row, "slug").trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
    const { data } = await supabase.from("products").select("id,title,slug").or(`slug.eq.${slug},title.eq.${title}`);
    const clash = (data ?? []).find((p) => p.id !== row.id);
    if (clash) return toast.error(`A product with this ${clash.slug === slug ? "slug" : "title"} already exists`);
    onSave();
  }

  function applyDraft(draft: ProductDraft) {
    const images = draft.images.filter(Boolean);
    onChange({
      ...row,
      title: draft.title || row.title,
      brand: draft.brand || row.brand,
      category: list.includes(draft.category) ? draft.category : draft.category || row.category,
      description: draft.description || row.description,
      highlights: draft.highlights.length ? draft.highlights.join("\n") : row.highlights,
      specs: Object.keys(draft.specs).length
        ? Object.entries(draft.specs)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : row.specs,
      warranty: draft.warranty || row.warranty,
      colors: draft.colors.length ? draft.colors.join(", ") : row.colors,
      price: draft.price || row.price,
      mrp: draft.mrp || row.mrp,
      seo_title: draft.seo_title || row.seo_title,
      seo_description: draft.seo_description || row.seo_description,
      seo_keywords: draft.seo_keywords || row.seo_keywords,
      image_url: row.image_url || images[0] || "",
      images: row.image_url ? [...(Array.isArray(row.images) ? (row.images as string[]) : []), ...images] : images.slice(1),
    });
    toast.success("Draft applied — review before saving");
  }

  async function run(kind: "generate" | "import" | "improve") {
    setBusy(kind);
    try {
      const categoriesList = list;
      if (kind === "generate") {
        if (!aiPrompt.trim()) throw new Error("Describe the product first");
        applyDraft(await generateProductDraft({ data: { prompt: aiPrompt.trim(), categories: categoriesList } }));
      } else if (kind === "import") {
        if (!importUrl.trim()) throw new Error("Paste a product URL first");
        applyDraft(await importProductFromUrl({ data: { url: importUrl.trim(), categories: categoriesList } }));
      } else {
        applyDraft(await improveProductDraft({ data: { draft: row, categories: categoriesList } }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setBusy(null);
    }
  }

  const comboIds = String(row.combo_product_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        saveChecked();
      }}
    >
      <div className="space-y-3 rounded-xl border border-dashed border-primary/40 p-3 sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder="Describe the product, e.g. Samsung Galaxy M14 5G 6GB 128GB"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <Button type="button" disabled={!!busy} onClick={() => run("generate")}>
            <Sparkles className="mr-1 h-4 w-4" /> {busy === "generate" ? "Generating…" : "Generate with AI"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder="Import from URL (brand site, Amazon, Flipkart)"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => run("import")}>
            <Link2 className="mr-1 h-4 w-4" /> {busy === "import" ? "Importing…" : "Import"}
          </Button>
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => run("improve")}>
            <Wand2 className="mr-1 h-4 w-4" /> {busy === "improve" ? "Improving…" : "Improve with AI"}
          </Button>
        </div>
      </div>

      <div className="sm:col-span-2">
        <Label>Images (first one is the primary image)</Label>
        <ImageManager value={gallery} onChange={setGallery} kind="product" />
      </div>

      {(
        [
          ["title", "Title", "text"],
          ["slug", "Slug", "text"],
          ["brand", "Brand", "text"],
          ["price", "Price", "number"],
          ["mrp", "MRP", "number"],
          ["rating", "Rating", "number"],
          ["rating_count", "Rating count", "number"],
          ["stock", "Stock", "number"],
          ["warranty", "Warranty", "text"],
          ["colors", "Colour variants (comma separated)", "text"],
          ["seo_title", "SEO title", "text"],
          ["seo_keywords", "SEO keywords", "text"],
        ] as [string, string, string][]
      ).map(([key, label, type]) => (
        <div key={key}>
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            type={type}
            step={type === "number" ? "any" : undefined}
            value={str(row, key)}
            onChange={(e) => onChange({ ...row, [key]: e.target.value })}
          />
        </div>
      ))}

      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          list="category-options"
          value={str(row, "category")}
          onChange={(e) => onChange({ ...row, category: e.target.value })}
        />
        <datalist id="category-options">
          {list.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <Label>Store</Label>
        <StoreField value={str(row, "store_id")} onChange={(v) => onChange({ ...row, store_id: v })} />
      </div>

      {(
        [
          ["description", "Description"],
          ["highlights", "Highlights (one per line)"],
          ["specs", "Specifications (Key: value per line)"],
          ["seo_description", "SEO description"],
        ] as [string, string][]
      ).map(([key, label]) => (
        <div key={key} className="sm:col-span-2">
          <Label htmlFor={key}>{label}</Label>
          <Textarea id={key} rows={4} value={str(row, key)} onChange={(e) => onChange({ ...row, [key]: e.target.value })} />
        </div>
      ))}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!row.gift_available}
          onChange={(e) => onChange({ ...row, gift_available: e.target.checked })}
        />
        Gift option available
      </label>
      <div>
        <Label htmlFor="gift_note">Gift note</Label>
        <Input id="gift_note" value={str(row, "gift_note")} onChange={(e) => onChange({ ...row, gift_note: e.target.value })} />
      </div>

      <div className="sm:col-span-2">
        <Label>Frequently bought together (combo products)</Label>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2 text-sm">
          {(allProducts.data ?? [])
            .filter((p) => p.id !== row.id)
            .map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={comboIds.includes(p.id)}
                  onChange={(e) =>
                    onChange({
                      ...row,
                      combo_product_ids: (e.target.checked
                        ? [...comboIds, p.id]
                        : comboIds.filter((id) => id !== p.id)
                      ).join(","),
                    })
                  }
                />
                {p.title}
              </label>
            ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={!!row.active} onChange={(e) => onChange({ ...row, active: e.target.checked })} />
        Visible on the store
      </label>
      <div className="sm:col-span-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
