import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Crop, Star, Trash2, Upload } from "lucide-react";
import {
  IMAGE_PRESETS,
  fileToDataUrl,
  loadImage,
  renderOptimizedFile,
  type ImageKind,
} from "@/lib/image-tools";
import { uploadProcessedImage, uploadStoreImage } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Crop + resize + compress tool with a fixed aspect ratio per image kind. */
export function CropDialog({
  file,
  kind,
  onCancel,
  onDone,
}: {
  file: File | null;
  kind: ImageKind;
  onCancel: () => void;
  onDone: (url: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aspect = IMAGE_PRESETS[kind].aspect;

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    setSrc(null);
    setZoom(1);
    setOffset({ x: 0.5, y: 0.5 });
    if (!file) return;
    fileToDataUrl(file)
      .then(loadImage)
      .then((img) => {
        if (cancelled) return;
        setImage(img);
        setSrc(img.src);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not read image"));
    return () => {
      cancelled = true;
    };
  }, [file]);

  /** Source rectangle for the current zoom/offset. */
  function cropRect(img: HTMLImageElement) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    let width = iw;
    let height = width / aspect;
    if (height > ih) {
      height = ih;
      width = height * aspect;
    }
    width /= zoom;
    height /= zoom;
    const x = (iw - width) * offset.x;
    const y = (ih - height) * offset.y;
    return { x, y, width, height };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const rect = cropRect(image);
    canvas.width = 640;
    canvas.height = Math.round(640 / aspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, zoom, offset, aspect]);

  async function save() {
    if (!image || !file) return;
    setBusy(true);
    try {
      const processed = await renderOptimizedFile(image, kind, cropRect(image), file.name.replace(/\.[^.]+$/, ""));
      const url = await uploadProcessedImage(processed);
      onDone(url);
      toast.success("Image optimised and uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crop &amp; optimise image</DialogTitle>
        </DialogHeader>
        {src ? (
          <div className="space-y-4">
            <canvas ref={canvasRef} className="w-full rounded-lg border border-border bg-muted" />
            <div>
              <Label>Zoom</Label>
              <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} />
            </div>
            <div>
              <Label>Horizontal position</Label>
              <Slider min={0} max={1} step={0.01} value={[offset.x]} onValueChange={([v]) => setOffset((o) => ({ ...o, x: v }))} />
            </div>
            <div>
              <Label>Vertical position</Label>
              <Slider min={0} max={1} step={0.01} value={[offset.y]} onValueChange={([v]) => setOffset((o) => ({ ...o, y: v }))} />
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={busy} onClick={save}>
                {busy ? "Uploading…" : "Use this crop"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading image…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ManagerProps = {
  /** Ordered list of image URLs — the first one is the primary image. */
  value: string[];
  onChange: (value: string[]) => void;
  kind: ImageKind;
  label?: string;
};

/**
 * Full image manager: upload (auto compress), crop, preview, reorder,
 * set primary and delete.
 */
export function ImageManager({ value, onChange, kind, label }: ManagerProps) {
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadStoreImage(f, kind)));
      onChange([...value, ...urls]);
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} optimised and uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {value.map((src, i) => (
            <div key={`${src}-${i}`} className="w-24 space-y-1">
              <div className="relative">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className={`h-24 w-24 rounded-lg border-2 object-cover ${i === 0 ? "border-primary" : "border-border"}`}
                />
                {i === 0 ? (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    Primary
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex justify-between">
                <button type="button" aria-label="Move left" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted">
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label="Set as primary"
                  onClick={() => onChange([src, ...value.filter((_, idx) => idx !== i)])}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Star className={`h-3 w-3 ${i === 0 ? "fill-primary text-primary" : ""}`} />
                </button>
                <button type="button" aria-label="Move right" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted">
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Upload & optimise"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={(e) => pick(e.target.files)} />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <Crop className="h-4 w-4" />
          Crop &amp; add
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setCropFile(f);
            }}
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

      <CropDialog
        file={cropFile}
        kind={kind}
        onCancel={() => setCropFile(null)}
        onDone={(uploaded) => {
          onChange([...value, uploaded]);
          setCropFile(null);
        }}
      />
    </div>
  );
}
