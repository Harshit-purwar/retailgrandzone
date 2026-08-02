import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { detectCurrentLocation } from "@/lib/geo";
import type { Store } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Row = Record<string, unknown>;

const emptyStore: Row = {
  name: "",
  city: "",
  address: "",
  latitude: 0,
  longitude: 0,
  radius_km: 8,
  delivery_estimate: "10 minutes",
  sort_order: 0,
  active: true,
};

const FIELDS: [string, string, string][] = [
  ["name", "Store name", "text"],
  ["city", "City", "text"],
  ["address", "Address", "text"],
  ["latitude", "Latitude", "number"],
  ["longitude", "Longitude", "number"],
  ["radius_km", "Delivery radius (km)", "number"],
  ["delivery_estimate", "Delivery time (e.g. 10 minutes)", "text"],
  ["sort_order", "Sort order", "number"],
];

export function useAdminStores() {
  return useQuery({
    queryKey: ["admin", "stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Store[];
    },
  });
}

export function StoresTab() {
  const qc = useQueryClient();
  const stores = useAdminStores();
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "stores"] });
    qc.invalidateQueries({ queryKey: ["stores"] });
  }

  async function save(row: Row) {
    const payload: Row = {
      name: row.name,
      city: row.city,
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      radius_km: Number(row.radius_km),
      delivery_estimate: String(row.delivery_estimate || "10 minutes"),
      sort_order: Number(row.sort_order),
      active: !!row.active,
    };
    const res = row.id
      ? await supabase.from("stores").update(payload as never).eq("id", row.id as string)
      : await supabase.from("stores").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success("Store saved");
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Store deleted");
    refresh();
  }

  async function fillFromGps() {
    if (!editing) return;
    setBusy(true);
    try {
      const loc = await detectCurrentLocation();
      setEditing({
        ...editing,
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: editing.city || loc.city || "",
        address: editing.address || [loc.address_line, loc.city, loc.state].filter(Boolean).join(", "),
      });
      toast.success("Coordinates filled from your location");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read your location");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button className="mb-3" onClick={() => setEditing({ ...emptyStore })}>
        <Plus className="mr-1 h-4 w-4" /> New store
      </Button>

      <div className="space-y-2">
        {(stores.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No stores yet — add your first location.</p>
        ) : null}
        {(stores.data ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {s.name} {s.active ? "" : "· hidden"}
              </p>
              <p className="text-muted-foreground">
                {s.city} · {s.delivery_estimate} · {s.radius_km} km radius
              </p>
              <p className="truncate text-muted-foreground">
                {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing({ ...(s as unknown as Row) })}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => remove(s.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Store location</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save(editing);
              }}
            >
              {FIELDS.map(([key, label, type]) => (
                <div key={key} className={key === "address" || key === "name" ? "sm:col-span-2" : ""}>
                  <Label htmlFor={`store-${key}`}>{label}</Label>
                  <Input
                    id={`store-${key}`}
                    type={type}
                    step={type === "number" ? "any" : undefined}
                    value={String(editing[key] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={fillFromGps} disabled={busy} className="w-full sm:w-auto">
                  <Navigation className="mr-1 h-4 w-4" />
                  {busy ? "Detecting…" : "Use my current location"}
                </Button>
              </div>

              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Store is live for customers
              </label>

              <div className="sm:col-span-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Dropdown used in the product/banner forms to assign an item to a store. */
export function StoreField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const stores = useAdminStores();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="">All stores</option>
      {(stores.data ?? []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
