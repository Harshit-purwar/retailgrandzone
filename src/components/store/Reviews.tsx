import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Camera, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadStoreImage } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Review = {
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

function useReviews(productId: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });
}

export function RatingSummary({ productId }: { productId: string }) {
  const { data: reviews } = useReviews(productId);
  const rows = reviews ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        No customer reviews yet. Be the first to review this product after you receive it.
      </div>
    );
  }

  const avg = rows.reduce((n, r) => n + r.rating, 0) / rows.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rows.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{avg.toFixed(1)}</p>
          <div className="mt-1 flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{rows.length} reviews</p>
        </div>
        <div className="flex-1 space-y-1">
          {counts.map((c) => (
            <div key={c.star} className="flex items-center gap-2 text-xs">
              <span className="w-6 shrink-0">{c.star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${(c.count / rows.length) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-muted-foreground">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { data: reviews } = useReviews(productId);
  const rows = reviews ?? [];

  return (
    <div className="space-y-4">
      <RatingSummary productId={productId} />
      <ReviewForm productId={productId} />
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-card p-4">
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
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  <BadgeCheck className="h-3 w-3" /> VERIFIED PURCHASE
                </span>
              ) : null}
            </div>
            {r.title ? <p className="mt-2 text-sm font-semibold">{r.title}</p> : null}
            {r.comment ? (
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
            ) : null}
            {Array.isArray(r.images) && (r.images as string[]).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(r.images as string[]).map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="review"
                    className="h-16 w-16 rounded object-cover"
                  />
                ))}
              </div>
            ) : null}
            {r.video_url ? (
              <video src={r.video_url} controls className="mt-2 max-h-64 rounded" />
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {r.user_email?.split("@")[0] || "Customer"} ·{" "}
              {new Date(r.created_at).toLocaleDateString()}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadStoreImage(file, "product");
      setImages((prev) => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit() {
    if (!user) return toast.error("Please log in to write a review.");
    if (rating < 1) return toast.error("Please select a star rating.");
    if (!comment.trim()) return toast.error("Please write a short review.");

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_review", {
        p_product_id: productId,
        p_rating: rating,
        p_title: title.trim(),
        p_comment: comment.trim(),
        p_images: images,
        p_video_url: videoUrl.trim(),
      });
      if (error) throw error;
      const res = (data ?? {}) as { id?: string; status?: string };
      if (res.status === "pending") {
        toast.success("Thank you! Your review is under moderation.");
      } else {
        toast.success("Thanks for your review!");
      }
      setOpen(false);
      setRating(0);
      setTitle("");
      setComment("");
      setImages([]);
      setVideoUrl("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {!open ? (
        <Button onClick={() => setOpen(true)}>Write a review</Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Write a review</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Reviews are available only after your order is delivered. One review per product.
          </p>

          <div>
            <Label>Rating</Label>
            <div className="mt-1 flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="p-1"
                  aria-label={`${i + 1} star`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7",
                      i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review-title">Title</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary (optional)"
            />
          </div>

          <div>
            <Label htmlFor="review-comment">Review</Label>
            <Textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the product?"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
              {uploading ? (
                <span className="text-xs text-muted-foreground">Uploading…</span>
              ) : (
                <>
                  <Camera className="h-4 w-4" /> Add photo
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            </label>
            <Input
              className="max-w-xs"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Video link (optional)"
            />
          </div>
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {images.map((src) => (
                <div key={src} className="relative">
                  <img src={src} alt="" className="h-16 w-16 rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((s) => s !== src))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <Button disabled={submitting} onClick={submit}>
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      )}
    </div>
  );
}
