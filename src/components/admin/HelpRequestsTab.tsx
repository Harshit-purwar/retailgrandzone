import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { HelpRequest, Order } from "@/lib/store-types";
import { HELP_STATUSES } from "@/lib/store-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";

export function HelpRequestsTab() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const requests = useQuery({
    queryKey: ["admin", "help-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HelpRequest[];
    },
  });

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("help_requests").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Help request updated");
    qc.invalidateQueries({ queryKey: ["admin", "help-requests"] });
  }

  async function openOrder(orderId: string) {
    const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error || !data) return toast.error("Order not found");
    setViewOrder(data as unknown as Order);
  }

  return (
    <div className="space-y-3">
      {(requests.data ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No help requests yet.</p>
      ) : null}

      {(requests.data ?? []).map((r) => (
        <div key={r.id} className="space-y-2 rounded border border-border p-3 text-sm">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex-1">
              <p className="font-medium">
                {r.full_name} ·{" "}
                <a href={`tel:${r.phone}`} className="text-primary hover:underline">
                  {r.phone}
                </a>
              </p>
              <p className="text-muted-foreground">
                {r.issue_category} · {new Date(r.created_at).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
            </div>
            <div className="w-full sm:w-44">
              <Select value={r.status} onValueChange={(v) => update(r.id, { status: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HELP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {r.order_id ? (
              <Button size="sm" variant="outline" onClick={() => openOrder(r.order_id!)}>
                Open order {r.order_id.slice(0, 8).toUpperCase()}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${r.phone}`}>
                <Phone className="mr-1 h-4 w-4" /> Call customer
              </a>
            </Button>
            {r.status !== "Resolved" ? (
              <Button size="sm" onClick={() => update(r.id, { status: "Resolved" })}>
                Mark resolved
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              rows={2}
              placeholder="Internal notes (optional)"
              value={notes[r.id] ?? r.admin_notes ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => update(r.id, { admin_notes: notes[r.id] ?? r.admin_notes ?? "" })}
            >
              Save note
            </Button>
          </div>
        </div>
      ))}

      <OrderDetailDialog order={viewOrder} onClose={() => setViewOrder(null)} />
    </div>
  );
}
