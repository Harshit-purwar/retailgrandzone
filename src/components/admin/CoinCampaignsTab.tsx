import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Pencil, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BASE_CATEGORIES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { inr } from "@/lib/store-types";

type CampaignRow = {
  id?: string;
  name: string;
  description?: string;
  active: boolean;
  starts_at: string;
  ends_at: string;
  reward_amounts: number[];
  max_per_customer: number;
  expires_days: number;
  eligible_categories: string[];
};

const emptyCampaign: CampaignRow = {
  name: "",
  description: "",
  active: false,
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  reward_amounts: [2, 3, 5, 10],
  max_per_customer: 50,
  expires_days: 7,
  eligible_categories: [],
};

export function CoinCampaignsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  const campaigns = useQuery({
    queryKey: ["admin", "coin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CampaignRow[];
    },
  });

  const rewards = useQuery({
    queryKey: ["admin", "coin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_rewards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        user_email: string;
        amount: number;
        status: string;
        expires_at: string;
        created_at: string;
      }[];
    },
  });

  const summary = (campaigns.data ?? []).reduce(
    (acc, c) => {
      acc.total += c.reward_amounts.length;
      return acc;
    },
    { total: 0 },
  );

  async function saveCampaign(row: CampaignRow) {
    if (!row.name.trim()) return toast.error("Campaign name is required");
    if (row.reward_amounts.length === 0) return toast.error("Add at least one reward amount");
    if (!row.starts_at || !row.ends_at) return toast.error("Set the campaign dates");
    if (new Date(row.ends_at) <= new Date(row.starts_at))
      return toast.error("End date must be after the start date");
    if (!row.max_per_customer || row.max_per_customer <= 0)
      return toast.error("Set a maximum above 0");

    const payload = {
      name: row.name.trim(),
      active: row.active,
      starts_at: new Date(row.starts_at).toISOString(),
      ends_at: new Date(row.ends_at).toISOString(),
      reward_amounts: row.reward_amounts,
      max_per_customer: row.max_per_customer,
      expires_days: row.expires_days,
      eligible_categories: row.eligible_categories,
    };

    const res = row.id
      ? await supabase
          .from("coin_campaigns")
          .update(payload as never)
          .eq("id", row.id)
      : await supabase.from("coin_campaigns").insert(payload as never);
    if (res.error) return toast.error(res.error.message);
    toast.success(row.id ? "Campaign updated" : "Campaign created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "coin-campaigns"] });
    qc.invalidateQueries({ queryKey: ["coin-campaign"] });
  }

  return (
    <div className="space-y-6">
      <Button
        className="mb-3"
        onClick={() => setEditing({ ...emptyCampaign, eligible_categories: [] })}
      >
        <Plus className="mr-1 h-4 w-4" /> New campaign
      </Button>

      {campaigns.isLoading ? (
        <p className="py-6 text-center text-muted-foreground">Loading campaigns…</p>
      ) : (campaigns.data ?? []).length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          No Lucky Coins campaign yet. Create one to reward customers on eligible orders.
        </p>
      ) : (
        <div className="space-y-2">
          {(campaigns.data ?? []).map((c) => {
            const now = Date.now();
            const live =
              c.active &&
              now >= new Date(c.starts_at).getTime() &&
              now <= new Date(c.ends_at).getTime();
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded border border-border p-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Coins className="h-5 w-5 text-amber-600" />
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-medium">
                    {c.name}
                    {c.active ? (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                        {live ? "LIVE" : "SCHEDULED"}
                      </span>
                    ) : (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        DISABLED
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    Rewards: {c.reward_amounts.map((r) => `₹${r}`).join(" / ")} · Max ₹
                    {c.max_per_customer}/customer · valid {c.expires_days} days
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(c.starts_at).toLocaleDateString()} →{" "}
                    {new Date(c.ends_at).toLocaleDateString()}
                    {c.eligible_categories.length > 0
                      ? ` · Categories: ${c.eligible_categories.join(", ")}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      ...(c as unknown as CampaignRow),
                      reward_amounts: Array.isArray(c.reward_amounts)
                        ? (c.reward_amounts as number[])
                        : [2, 3, 5, 10],
                      eligible_categories: Array.isArray(c.eligible_categories)
                        ? (c.eligible_categories as string[])
                        : [],
                      starts_at: new Date(c.starts_at).toISOString().slice(0, 16),
                      ends_at: new Date(c.ends_at).toISOString().slice(0, 16),
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Reward history</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "coin-rewards"] })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {rewards.isLoading ? (
          <p className="py-4 text-center text-muted-foreground">Loading…</p>
        ) : (rewards.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No rewards claimed yet ({summary.total} reward amounts configured).
          </p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Claimed</th>
                </tr>
              </thead>
              <tbody>
                {(rewards.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{r.user_email || "—"}</td>
                    <td className="px-3 py-2 font-medium">₹{r.amount}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          r.status === "active"
                            ? "bg-green-100 text-green-700"
                            : r.status === "used"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2">{new Date(r.expires_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit campaign" : "New campaign"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <CampaignForm
              row={editing}
              onChange={setEditing}
              onSave={() => saveCampaign(editing)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignForm({
  row,
  onChange,
  onSave,
}: {
  row: CampaignRow;
  onChange: (row: CampaignRow) => void;
  onSave: () => void;
}) {
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          value={row.name}
          onChange={(e) => onChange({ ...row, name: e.target.value })}
          placeholder="e.g. Monsoon Lucky Coins"
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="campaign-desc">Description (optional)</Label>
        <Textarea
          id="campaign-desc"
          rows={2}
          value={row.description ?? ""}
          onChange={(e) => onChange({ ...row, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="campaign-start">Starts</Label>
        <Input
          id="campaign-start"
          type="datetime-local"
          value={row.starts_at}
          onChange={(e) => onChange({ ...row, starts_at: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="campaign-end">Ends</Label>
        <Input
          id="campaign-end"
          type="datetime-local"
          value={row.ends_at}
          onChange={(e) => onChange({ ...row, ends_at: e.target.value })}
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Reward amounts (₹ per draw)</Label>
        <div className="flex flex-wrap items-center gap-2">
          {[2, 3, 5, 10].map((v) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50"
            >
              <input
                type="checkbox"
                className="accent-amber-500"
                checked={row.reward_amounts.includes(v)}
                onChange={(e) => {
                  const set = new Set(row.reward_amounts);
                  if (e.target.checked) set.add(v);
                  else set.delete(v);
                  onChange({ ...row, reward_amounts: [...set].sort((a, b) => a - b) });
                }}
              />
              ₹{v}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="campaign-max">Max Coins per customer (₹)</Label>
        <Input
          id="campaign-max"
          type="number"
          min={1}
          value={String(row.max_per_customer)}
          onChange={(e) => onChange({ ...row, max_per_customer: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor="campaign-expires">Coins valid for (days)</Label>
        <Input
          id="campaign-expires"
          type="number"
          min={1}
          value={String(row.expires_days)}
          onChange={(e) => onChange({ ...row, expires_days: Number(e.target.value) })}
        />
      </div>

      <div className="sm:col-span-2">
        <Label>Eligible categories (empty = all categories)</Label>
        <div className="flex flex-wrap gap-1.5">
          {BASE_CATEGORIES.map((cat) => {
            const checked = row.eligible_categories.includes(cat);
            return (
              <label
                key={cat}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50"
              >
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={checked}
                  onChange={(e) => {
                    const set = new Set(row.eligible_categories);
                    if (e.target.checked) set.add(cat);
                    else set.delete(cat);
                    onChange({ ...row, eligible_categories: [...set] });
                  }}
                />
                {cat}
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Customers can only earn and spend Coins on orders containing these categories.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={row.active}
          onChange={(e) => onChange({ ...row, active: e.target.checked })}
        />
        Campaign is active
      </label>

      <p className="text-xs text-muted-foreground sm:col-span-2">
        Each reward expires individually after {row.expires_days} days. Coins are a wallet discount
        only — no cash withdrawal or auto-debit.
      </p>

      <div className="sm:col-span-2">
        <Button type="submit" className="w-full sm:w-auto">
          Save campaign
        </Button>
      </div>
    </form>
  );
}
