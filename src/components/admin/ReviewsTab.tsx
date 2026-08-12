import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReviewRow = {
  id: string;
  product_id: string;
  user_email: string;
  rating: number;
  title: string;
  comment: string;
  images: unknown;
  video_url: string;
  verified: boolean;
  status: string;
  created_at: string;
};

const PRODUCTS_KEY: Record<string, string> = {};

export function ReviewsTab() {
  const qc = useQueryClient();

  const reviews = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const products = useQuery({
    queryKey: ["admin", "reviews-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,title");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; title: string }[];
    },
  });

  for (const p of products.data ?? []) PRODUCTS_KEY[p.id] = p.title;

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "hidden" ? "Review hidden" : "Review shown");
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  }

  async function removeReview(id: string) {
    if (!window.confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted");
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  }

  const rows = reviews.data ?? [];
  const stats = rows.reduce(
    (acc, r) => {
      if (r.status === "approved") acc.approved++;
      else if (r.status === "pending") acc.pending++;
      else acc.hidden++;
      return acc;
    },
    { approved: 0, pending: 0, hidden: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700">
          {stats.approved} approved
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
          {stats.pending} pending
        </span>
        <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-600">
          {stats.hidden} hidden
        </span>
      </div>

      {reviews.isLoading ? (
        <p className="py-8 text-center text-muted-foreground">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No reviews yet. They appear here after a verified purchase is delivered.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                      )}
                    />
                  ))}
                </div>
                {r.verified ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    VERIFIED PURCHASE
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    r.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : r.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-600",
                  )}
                >
                  {r.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{r.title || "Untitled review"}</p>
              <p className="text-sm text-muted-foreground">{r.comment || "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.user_email || "Anonymous"} · {new Date(r.created_at).toLocaleDateString()} ·{" "}
                {PRODUCTS_KEY[r.product_id] ?? "Unknown product"}
              </p>
              {Array.isArray(r.images) && (r.images as string[]).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(r.images as string[]).map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt="review"
                      className="h-14 w-14 rounded object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus(r.id, r.status === "hidden" ? "approved" : "hidden")}
                >
                  {r.status === "hidden" ? (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Show
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeReview(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
