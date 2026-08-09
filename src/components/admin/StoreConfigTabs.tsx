import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Coupon, StoreSettings } from "@/lib/store-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Optional delivery-fee rules — admin can switch the fee off entirely. */
export function DeliveryTab() {
  const qc = useQueryClient();
  const [row, setRow] = useState<StoreSettings | null>(null);
  const [busy, setBusy] = useState(false);

  const settings = useQuery({
    queryKey: ["admin", "store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as StoreSettings | null) ?? null;
    },
  });

  useEffect(() => {
    if (settings.data) setRow(settings.data);
  }, [settings.data]);

  async function save() {
    if (!row) return;
    setBusy(true);
    const payload = {
      delivery_fee_enabled: row.delivery_fee_enabled,
      delivery_fee: Number(row.delivery_fee) || 0,
      free_delivery_above: Number(row.free_delivery_above) || 0,
      delivery_estimate: (row.delivery_estimate || "2-4 Days").trim(),
      support_phone: (row.support_phone || "6392480868").trim(),
      admin_whatsapp: (row.admin_whatsapp || "").trim(),
    };
    const res = row.id
      ? await supabase
          .from("store_settings")
          .update(payload as never)
          .eq("id", row.id)
      : await supabase.from("store_settings").insert(payload as never);
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Delivery settings saved");
    qc.invalidateQueries({ queryKey: ["admin", "store-settings"] });
    qc.invalidateQueries({ queryKey: ["store-settings"] });
  }

  if (!row) return <p className="py-8 text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-lg space-y-4">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
        <span>
          <span className="block text-sm font-medium">Charge a delivery fee</span>
          <span className="block text-xs text-muted-foreground">
            Turn off to keep delivery free for everyone
          </span>
        </span>
        <Switch
          checked={row.delivery_fee_enabled}
          onCheckedChange={(v) => setRow({ ...row, delivery_fee_enabled: v })}
        />
      </label>

      <div>
        <Label htmlFor="fee">Delivery fee (₹)</Label>
        <Input
          id="fee"
          type="number"
          min={0}
          disabled={!row.delivery_fee_enabled}
          value={String(row.delivery_fee)}
          onChange={(e) => setRow({ ...row, delivery_fee: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="free-above">Free delivery above (₹) — 0 to disable</Label>
        <Input
          id="free-above"
          type="number"
          min={0}
          disabled={!row.delivery_fee_enabled}
          value={String(row.free_delivery_above)}
          onChange={(e) => setRow({ ...row, free_delivery_above: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="estimate">Default delivery estimate</Label>
        <Input
          id="estimate"
          placeholder="e.g. Today, Tomorrow, 2-4 Days"
          value={row.delivery_estimate ?? ""}
          onChange={(e) => setRow({ ...row, delivery_estimate: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on product, checkout and order pages when the customer has not shared a live
          location.
        </p>
      </div>

      <div>
        <Label htmlFor="support-phone">Support phone number</Label>
        <Input
          id="support-phone"
          value={row.support_phone ?? ""}
          onChange={(e) => setRow({ ...row, support_phone: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="admin-whatsapp">Admin WhatsApp number (order alerts)</Label>
        <Input
          id="admin-whatsapp"
          placeholder="e.g. 6392480868"
          value={row.admin_whatsapp ?? ""}
          onChange={(e) => setRow({ ...row, admin_whatsapp: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Every new order sends a WhatsApp alert to this number (requires the WhatsApp API
          credentials to be configured).
        </p>
      </div>

      <Button disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

const emptyCoupon = {
  code: "",
  discount_type: "percent",
  value: 10,
  min_order: 0,
  max_discount: 0,
  free_delivery: false,
  active: true,
  expires_at: "",
};

type CouponDraft = typeof emptyCoupon & { id?: string };

/** Optional coupon codes — the store works fine with none. */
export function CouponsTab() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<CouponDraft | null>(null);

  const coupons = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Coupon[];
    },
  });

  async function save() {
    if (!draft) return;
    const payload = {
      code: draft.code.trim().toUpperCase(),
      discount_type: draft.discount_type,
      value: Number(draft.value) || 0,
      min_order: Number(draft.min_order) || 0,
      max_discount: Number(draft.max_discount) || 0,
      free_delivery: draft.free_delivery,
      active: draft.active,
      expires_at: draft.expires_at ? new Date(draft.expires_at).toISOString() : null,
    };
    if (!payload.code) return toast.error("Coupon code is required");
    const res = draft.id
      ? await supabase
          .from("coupons")
          .update(payload as never)
          .eq("id", draft.id)
      : await supabase.from("coupons").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success("Coupon saved");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
  }

  return (
    <div className="space-y-4">
      {draft ? (
        <form
          className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <Label htmlFor="type">Discount type</Label>
            <Select
              value={draft.discount_type}
              onValueChange={(v) => setDraft({ ...draft, discount_type: v })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent off (%)</SelectItem>
                <SelectItem value="flat">Flat amount off (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="number"
              min={0}
              value={String(draft.value)}
              onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="min">Minimum order (₹)</Label>
            <Input
              id="min"
              type="number"
              min={0}
              value={String(draft.min_order)}
              onChange={(e) => setDraft({ ...draft, min_order: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="max">Max discount (₹) — 0 for no cap</Label>
            <Input
              id="max"
              type="number"
              min={0}
              value={String(draft.max_discount)}
              onChange={(e) => setDraft({ ...draft, max_discount: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="exp">Expiry date (optional)</Label>
            <Input
              id="exp"
              type="date"
              value={draft.expires_at ? draft.expires_at.slice(0, 10) : ""}
              onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.free_delivery}
              onCheckedChange={(v) => setDraft({ ...draft, free_delivery: v })}
            />
            Also makes delivery free
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.active}
              onCheckedChange={(v) => setDraft({ ...draft, active: v })}
            />
            Active
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Save coupon</Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setDraft({ ...emptyCoupon })}>
          <Plus className="mr-1 h-4 w-4" /> New coupon
        </Button>
      )}

      <div className="space-y-2">
        {(coupons.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No coupons yet — coupons are optional, the store works without them.
          </p>
        ) : null}
        {(coupons.data ?? []).map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <div className="flex-1">
              <p className="font-semibold">
                {c.code} {c.active ? "" : "· inactive"}
              </p>
              <p className="text-muted-foreground">
                {c.discount_type === "flat" ? `₹${c.value} off` : `${c.value}% off`}
                {Number(c.min_order) > 0 ? ` · min ₹${c.min_order}` : ""}
                {Number(c.max_discount) > 0 ? ` · max ₹${c.max_discount}` : ""}
                {c.free_delivery ? " · free delivery" : ""}
                {c.expires_at
                  ? ` · till ${new Date(c.expires_at).toLocaleDateString("en-IN")}`
                  : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  id: c.id,
                  code: c.code,
                  discount_type: c.discount_type,
                  value: Number(c.value),
                  min_order: Number(c.min_order),
                  max_discount: Number(c.max_discount),
                  free_delivery: c.free_delivery,
                  active: c.active,
                  expires_at: c.expires_at ?? "",
                })
              }
            >
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
