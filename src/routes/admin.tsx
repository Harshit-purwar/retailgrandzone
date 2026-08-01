import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { BASE_CATEGORIES, useCategories } from "@/lib/categories";
import { uploadStoreImage } from "@/lib/storage-upload";
import type { Banner, Order, Product } from "@/lib/store-types";
import { ORDER_STATUSES, inr } from "@/lib/store-types";
import { CouponsTab, DeliveryTab } from "@/components/admin/StoreConfigTabs";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { HelpRequestsTab } from "@/components/admin/HelpRequestsTab";
import { NewOrderDialog } from "@/components/admin/NewOrderDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — The Grand Zone" },
      { name: "description", content: "Manage The Grand Zone products, banners and customer orders." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin panel — The Grand Zone" },
      { property: "og:description", content: "Manage The Grand Zone products, banners and customer orders." },
    ],
  }),
  component: AdminPage,
});

type AnyRecord = Record<string, unknown>;

const emptyProduct: AnyRecord = {
  title: "",
  slug: "",
  brand: "",
  category: "Mobiles",
  description: "",
  price: 0,
  mrp: 0,
  image_url: "",
  images: [] as string[],
  rating: 4.2,
  rating_count: 0,
  stock: 10,
  highlights: "",
  specs: "",
  active: true,
};

const emptyBanner: AnyRecord = {
  title: "",
  subtitle: "",
  cta_text: "Shop now",
  image_url: "",
  placement: "hero",
  link_category: "",
  product_id: "",
  sort_order: 0,
  active: true,
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { redirect: "/admin" }, replace: true });
    else if (!isAdmin) navigate({ to: "/", replace: true });
  }, [loading, user, isAdmin, navigate]);

  const products = useQuery({
    enabled: isAdmin,
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const banners = useQuery({
    enabled: isAdmin,
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Banner[];
    },
  });

  const orders = useQuery({
    enabled: isAdmin,
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const [editing, setEditing] = useState<{ kind: "product" | "banner"; row: AnyRecord } | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);


  if (!isAdmin) return null;

  async function saveProduct(row: AnyRecord) {
    const payload: AnyRecord = {
      title: row.title,
      slug: String(row.slug || "").trim() || String(row.title).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brand: row.brand,
      category: row.category,
      description: row.description,
      price: Number(row.price),
      mrp: Number(row.mrp),
      image_url: row.image_url,
      images: Array.isArray(row.images) ? (row.images as string[]).filter(Boolean) : [],
      rating: Number(row.rating),
      rating_count: Number(row.rating_count),
      stock: Number(row.stock),
      active: !!row.active,
      highlights: String(row.highlights || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      specs: Object.fromEntries(
        String(row.specs || "")
          .split("\n")
          .map((l) => l.split(":"))
          .filter((p) => p.length >= 2)
          .map((p) => [p[0].trim(), p.slice(1).join(":").trim()]),
      ),
    };
    const res = row.id
      ? await supabase.from("products").update(payload as never).eq("id", row.id as string)
      : await supabase.from("products").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success("Product saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function saveBanner(row: AnyRecord) {
    const payload: AnyRecord = {
      title: row.title,
      subtitle: row.subtitle,
      cta_text: row.cta_text,
      image_url: row.image_url,
      placement: row.placement,
      link_category: row.link_category || null,
      product_id: row.product_id || null,
      sort_order: Number(row.sort_order),
      active: !!row.active,
    };
    const res = row.id
      ? await supabase.from("banners").update(payload as never).eq("id", row.id as string)
      : await supabase.from("banners").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success("Banner saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "banners"] });
    qc.invalidateQueries({ queryKey: ["banners"] });
  }

  async function remove(table: "products" | "banners", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin", table] });
    qc.invalidateQueries({ queryKey: [table] });
  }

  async function setOrderStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <h1 className="mb-4 text-xl font-semibold">Admin panel</h1>

      <Tabs defaultValue="products" className="rounded-lg bg-card p-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="help">Help requests</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="pt-4">
          <Button className="mb-3" onClick={() => setEditing({ kind: "product", row: { ...emptyProduct } })}>
            <Plus className="mr-1 h-4 w-4" /> New product
          </Button>
          <div className="space-y-2">
            {(products.data ?? []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3">
                <img src={p.image_url} alt={p.title} className="h-12 w-12 object-contain" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-muted-foreground">
                    {p.category} · {inr(Number(p.price))} · stock {p.stock}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      kind: "product",
                      row: {
                        ...(p as unknown as AnyRecord),
                        images: Array.isArray(p.images) ? (p.images as string[]) : [],
                        highlights: Array.isArray(p.highlights) ? (p.highlights as string[]).join("\n") : "",

                        specs:
                          p.specs && typeof p.specs === "object"
                            ? Object.entries(p.specs as Record<string, unknown>)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join("\n")
                            : "",
                      },
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove("products", p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="banners" className="pt-4">
          <Button className="mb-3" onClick={() => setEditing({ kind: "banner", row: { ...emptyBanner } })}>
            <Plus className="mr-1 h-4 w-4" /> New banner
          </Button>
          <div className="space-y-2">
            {(banners.data ?? []).map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3">
                <img src={b.image_url} alt={b.title} className="h-12 w-20 rounded object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-muted-foreground">
                    {b.placement} · {b.link_category ?? b.product_id ?? "no link"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing({ kind: "banner", row: { ...(b as unknown as AnyRecord) } })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove("banners", b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="pt-4">
          <div className="space-y-2">
            {(orders.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No orders yet.</p>
            ) : null}
            {(orders.data ?? []).map((o) => (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                onClick={() => setViewOrder(o)}
                onKeyDown={(e) => e.key === "Enter" && setViewOrder(o)}
                className="flex cursor-pointer flex-wrap items-center gap-3 rounded border border-border p-3 text-sm hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {o.id.slice(0, 8).toUpperCase()} · {o.full_name} · {o.phone}
                  </p>
                  <p className="text-muted-foreground">
                    {o.address_line}, {o.city}, {o.state} — {o.pincode}
                  </p>
                  <p className="text-muted-foreground">
                    {o.payment_method} ({o.payment_status}) · {new Date(o.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="font-semibold">{inr(Number(o.total))}</span>
                <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-44">
                  <Select value={o.status} onValueChange={(v) => setOrderStatus(o.id, v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

          </div>
        </TabsContent>

        <TabsContent value="coupons" className="pt-4">
          <CouponsTab />
        </TabsContent>

        <TabsContent value="delivery" className="pt-4">
          <DeliveryTab />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.kind === "banner" ? "Banner" : "Product"} details</DialogTitle>
          </DialogHeader>
          {editing ? (
            <EditForm
              kind={editing.kind}
              row={editing.row}
              onChange={(row) => setEditing({ ...editing, row })}
              onSave={() => (editing.kind === "product" ? saveProduct(editing.row) : saveBanner(editing.row))}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <OrderDetailDialog order={viewOrder} onClose={() => setViewOrder(null)} />

    </div>
  );
}

function EditForm({
  kind,
  row,
  onChange,
  onSave,
}: {
  kind: "product" | "banner";
  row: AnyRecord;
  onChange: (row: AnyRecord) => void;
  onSave: () => void;
}) {
  const fields: [string, string, "text" | "number" | "area" | "gallery"][] =
    kind === "product"
      ? [
          ["title", "Title", "text"],
          ["slug", "Slug", "text"],
          ["brand", "Brand", "text"],
          ["category", "Category", "text"],
          ["image_url", "Main image", "text"],
          ["images", "More images (gallery)", "gallery"],

          ["price", "Price", "number"],
          ["mrp", "MRP", "number"],
          ["rating", "Rating", "number"],
          ["rating_count", "Rating count", "number"],
          ["stock", "Stock", "number"],
          ["description", "Description", "area"],
          ["highlights", "Highlights (one per line)", "area"],
          ["specs", "Specifications (Key: value per line)", "area"],
        ]
      : [
          ["title", "Title", "text"],
          ["subtitle", "Subtitle", "text"],
          ["cta_text", "Button text", "text"],
          ["image_url", "Image URL", "text"],
          ["placement", "Placement (hero or promo)", "text"],
          ["link_category", "Link to category", "text"],
          ["product_id", "Link to product ID", "text"],
          ["sort_order", "Sort order", "number"],
        ];

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      {fields.map(([key, label, type]) => (
        <div key={key} className={type === "area" || type === "gallery" || key === "image_url" ? "sm:col-span-2" : ""}>
          <Label htmlFor={key}>{label}</Label>
          {type === "gallery" ? (
            <GalleryField
              value={Array.isArray(row[key]) ? (row[key] as string[]) : []}
              onChange={(v) => onChange({ ...row, [key]: v })}
            />
          ) : key === "image_url" ? (
            <ImageField value={String(row[key] ?? "")} onChange={(v) => onChange({ ...row, [key]: v })} />
          ) : key === "category" || key === "link_category" ? (

            <CategoryField
              allowEmpty={key === "link_category"}
              value={String(row[key] ?? "")}
              onChange={(v) => onChange({ ...row, [key]: v })}
            />
          ) : type === "area" ? (
            <Textarea
              id={key}
              rows={4}
              value={String(row[key] ?? "")}
              onChange={(e) => onChange({ ...row, [key]: e.target.value })}
            />
          ) : (
            <Input
              id={key}
              type={type}
              step={type === "number" ? "any" : undefined}
              value={String(row[key] ?? "")}
              onChange={(e) => onChange({ ...row, [key]: e.target.value })}
            />
          )}
        </div>
      ))}

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={!!row.active}
          onChange={(e) => onChange({ ...row, active: e.target.checked })}
        />
        Visible on the store
      </label>
      <div className="sm:col-span-2">
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

function GalleryField({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadStoreImage(f)));
      onChange([...value, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((src, i) => (
            <div key={`${src}-${i}`} className="relative">
              <img src={src} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Choose files"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => pick(e.target.files)}
          />
        </label>
        <Input
          className="w-full sm:w-auto sm:flex-1"
          placeholder="…or paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!url.trim()) return;
            onChange([...value, url.trim()]);
            setUrl("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {

  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadStoreImage(file);
      onChange(url);
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
        {value ? (
          <img src={value} alt="Selected" className="h-16 w-16 rounded-lg border border-border object-cover" />
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Choose file"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
      </div>
      <Input
        placeholder="…or paste an image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CategoryField({
  value,
  onChange,
  allowEmpty,
}: {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  const categories = useCategories();
  const list = categories.data ?? BASE_CATEGORIES;
  const known = value === "" || list.includes(value);
  const [creating, setCreating] = useState(false);

  if (creating || !known) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="New category name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => setCreating(false)}>
          Pick existing
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || "__none"}
      onValueChange={(v) => {
        if (v === "__new") {
          setCreating(true);
          onChange("");
        } else {
          onChange(v === "__none" ? "" : v);
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? <SelectItem value="__none">No category</SelectItem> : null}
        {list.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
        <SelectItem value="__new">+ Create new category…</SelectItem>
      </SelectContent>
    </Select>
  );
}
