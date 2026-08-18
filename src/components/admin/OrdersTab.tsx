import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderItem } from "@/lib/store-types";
import { ORDER_STATUSES, inr } from "@/lib/store-types";
import { storeImageUrl } from "@/lib/store-image";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";
import { NewOrderDialog } from "@/components/admin/NewOrderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TRACK_STEPS = ["Ordered", "Packed", "Shipped", "Out for delivery", "Delivered"];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function statusTone(status: string): { badge: string; bar: string } {
  const s = String(status ?? "").toLowerCase();
  if (/delivered/i.test(s)) return { badge: "bg-emerald-600", bar: "border-emerald-500" };
  if (/cancelled|returned/i.test(s)) return { badge: "bg-red-600", bar: "border-red-500" };
  if (/shipped|out for delivery/i.test(s))
    return { badge: "bg-amber-500", bar: "border-amber-400" };
  if (/ordered|packed|confirmed/i.test(s)) return { badge: "bg-blue-600", bar: "border-blue-500" };
  return { badge: "bg-muted-foreground", bar: "border-border" };
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Flipkart-style order tracking stepper shown inside an expanded order. */
function TrackSteps({ status }: { status: string }) {
  const cancelled = /cancelled/i.test(String(status ?? ""));
  const current = TRACK_STEPS.findIndex(
    (s) => s.toLowerCase() === String(status ?? "").toLowerCase(),
  );
  const step = current >= 0 ? current : -1;

  return (
    <div className="flex items-center">
      {TRACK_STEPS.map((label, i) => {
        const done = !cancelled && step >= 0 && i <= step;
        const isNow = !cancelled && i === step;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-emerald-600 text-white"
                    : "border-2 border-border bg-card text-muted-foreground"
                } ${isNow ? "ring-2 ring-blue-500/40" : ""}`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`mt-1 max-w-14 whitespace-nowrap text-center text-[10px] leading-tight ${
                  done ? "font-semibold text-emerald-700" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < TRACK_STEPS.length - 1 ? (
              <span
                className={`mx-1 mb-4 h-0.5 flex-1 rounded ${
                  !cancelled && step > i ? "bg-emerald-600" : "bg-border"
                }`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OrdersTab({
  orders,
  isLoading,
  onInvalidate,
}: {
  orders: Order[];
  isLoading: boolean;
  onInvalidate: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkBusy, setBulkBusy] = useState(false);

  const items = useQuery({
    enabled: !!expandedId,
    queryKey: ["admin", "order-items", expandedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", expandedId!);
      if (error) throw error;
      return (data ?? []) as unknown as OrderItem[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchFilter =
        filter === "all" ||
        (filter === "active" && !/delivered|cancelled/i.test(o.status ?? "")) ||
        (filter === "delivered" && /delivered/i.test(o.status ?? "")) ||
        (filter === "cancelled" && /cancelled/i.test(o.status ?? ""));
      if (!matchFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        (o.full_name ?? "").toLowerCase().includes(q) ||
        (o.phone ?? "").includes(q) ||
        (o.city ?? "").toLowerCase().includes(q) ||
        (o.payment_method ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, filter]);

  const totalShown = filtered.reduce((n, o) => n + Number(o.total || 0), 0);

  const oldOrders = useMemo(() => {
    const cutoff = Date.now() - bulkDays * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.created_at).getTime() <= cutoff);
  }, [orders, bulkDays]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Order marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    onInvalidate();
  }

  async function deleteOrder(order: Order) {
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    setConfirmDelete(null);
    if (error) return toast.error(error.message);
    toast.success(`Order ${shortId(order.id)} deleted`);
    if (expandedId === order.id) setExpandedId(null);
    onInvalidate();
  }

  async function deleteOldOrders() {
    if (oldOrders.length === 0) return;
    setBulkBusy(true);
    const ids = oldOrders.map((o) => o.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const { error } = await supabase.from("orders").delete().in("id", chunk);
      if (error) {
        setBulkBusy(false);
        setBulkOpen(false);
        return toast.error(error.message);
      }
      deleted += chunk.length;
    }
    setBulkBusy(false);
    setBulkOpen(false);
    toast.success(`${deleted} old order${deleted === 1 ? "" : "s"} deleted`);
    if (expandedId && ids.includes(expandedId)) setExpandedId(null);
    onInvalidate();
  }

  return (
    <div>
      {/* Toolbar: search + filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setNewOrderOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New order
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setBulkOpen(true)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="mr-1 h-4 w-4" /> Delete old orders
        </Button>
        <div className="relative w-full min-w-52 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, name, phone, city…"
            className="pl-8"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === "all"
              ? orders.length
              : f.id === "active"
                ? orders.filter((o) => !/delivered|cancelled/i.test(o.status ?? "")).length
                : f.id === "delivered"
                  ? orders.filter((o) => /delivered/i.test(o.status ?? "")).length
                  : orders.filter((o) => /cancelled/i.test(o.status ?? "")).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {orders.length} orders · total {inr(totalShown)}
      </p>

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading orders…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No orders found.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {filtered.map((o) => {
            const tone = statusTone(o.status ?? "");
            const open = expandedId === o.id;
            return (
              <div
                key={o.id}
                className={`overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-colors ${tone.bar} ${
                  open ? "border-l-primary ring-1 ring-primary/20" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : o.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-bold text-primary">#{shortId(o.id)}</span>
                      <span className="truncate text-sm font-medium">{o.full_name}</span>
                      <span className="hidden text-muted-foreground sm:inline">· {o.phone}</span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(o.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>
                        {o.payment_method} · {o.payment_status}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold">{inr(Number(o.total))}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${tone.badge}`}
                    >
                      {o.status ?? "—"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {open ? (
                  <div className="border-t border-border bg-muted/30 px-3 py-3 sm:px-4">
                    <TrackSteps status={o.status ?? ""} />

                    {/* Items */}
                    <div className="mt-3 space-y-2">
                      {items.isLoading ? (
                        <p className="text-xs text-muted-foreground">Loading items…</p>
                      ) : (items.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items recorded.</p>
                      ) : (
                        (items.data ?? []).map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center gap-3 rounded-lg bg-card p-2"
                          >
                            {it.image_url ? (
                              <img
                                src={storeImageUrl(it.image_url, 120)}
                                alt={it.title}
                                className="h-12 w-12 shrink-0 rounded object-contain"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1 text-sm">
                              <p className="line-clamp-2 font-medium">{it.title}</p>
                              <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
                            </div>
                            <span className="text-sm font-semibold">
                              {inr(Number(it.price) * it.quantity)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Delivery address */}
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {o.address_line}
                      {o.landmark ? `, ${o.landmark}` : ""}, {o.city}, {o.state} — {o.pincode}
                      {o.delivery_estimate ? (
                        <span className="inline-flex items-center gap-1">
                          <PackageCheck className="h-3.5 w-3.5" /> est. {o.delivery_estimate}
                        </span>
                      ) : null}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="w-44">
                        <Select value={o.status} onValueChange={(v) => void updateStatus(o.id, v)}>
                          <SelectTrigger>
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
                      <Button size="sm" variant="outline" onClick={() => setViewOrder(o)}>
                        <FileText className="mr-1 h-4 w-4" /> Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDelete(o)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Single order delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete order #{confirmDelete ? shortId(confirmDelete.id) : ""}?
            </DialogTitle>
            <DialogDescription>
              {confirmDelete ? (
                <>
                  <span className="font-medium">{confirmDelete.full_name}</span> ·{" "}
                  {inr(Number(confirmDelete.total))} ·{" "}
                  {new Date(confirmDelete.created_at).toLocaleDateString("en-IN")}
                  <br />
                  This permanently removes the order and its items. This cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && void deleteOrder(confirmDelete)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete old orders */}
      <Dialog open={bulkOpen} onOpenChange={(open) => !open && setBulkOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete old orders</DialogTitle>
            <DialogDescription>
              Remove orders older than the chosen cutoff to free up space. This permanently deletes
              them and their items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Keep orders from the last
              </label>
              <Select value={String(bulkDays)} onValueChange={(v) => setBulkDays(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {oldOrders.length === 0 ? (
                <p className="text-muted-foreground">
                  No orders older than {bulkDays} days. Nothing to delete.
                </p>
              ) : (
                <p>
                  <span className="font-bold text-red-600">{oldOrders.length} orders</span> are
                  older than {bulkDays} days, worth{" "}
                  <span className="font-semibold">
                    {inr(oldOrders.reduce((n, o) => n + Number(o.total || 0), 0))}
                  </span>
                  .
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={oldOrders.length === 0 || bulkBusy}
              onClick={() => void deleteOldOrders()}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {bulkBusy ? "Deleting…" : `Delete ${oldOrders.length} old orders`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailDialog order={viewOrder} onClose={() => setViewOrder(null)} />
      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["admin", "orders"] });
          onInvalidate();
        }}
      />
    </div>
  );
}
