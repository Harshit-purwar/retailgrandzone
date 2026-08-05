/**
 * Client-side image optimisation helpers: resize, crop and compress before an
 * upload ever reaches storage. Keeps uploads small so pages load fast.
 */

export type ImageKind = "banner" | "product" | "thumbnail";

export type ImagePreset = {
  /** Target width in px. */
  width: number;
  /** Fixed aspect ratio (width / height) used by the crop tool. */
  aspect: number;
  quality: number;
};

export const IMAGE_PRESETS: Record<ImageKind, ImagePreset> = {
  banner: { width: 1600, aspect: 16 / 6, quality: 0.82 },
  product: { width: 1200, aspect: 1, quality: 0.85 },
  thumbnail: { width: 400, aspect: 1, quality: 0.8 },
};

/** True when the browser can encode WebP (all modern ones can). */
function supportsWebp(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read this image"));
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file"));
    reader.readAsDataURL(file);
  });
}

export type CropRect = { x: number; y: number; width: number; height: number };

/**
 * Draws (optionally a crop of) an image onto a canvas at the preset size and
 * returns a compressed WebP file — falling back to JPEG when unsupported.
 */
export async function renderOptimizedFile(
  image: HTMLImageElement,
  kind: ImageKind,
  crop?: CropRect,
  name = "image",
): Promise<File> {
  const preset = IMAGE_PRESETS[kind];
  const source: CropRect = crop ?? {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };

  const targetWidth = Math.min(preset.width, Math.round(source.width));
  const targetHeight = Math.round(targetWidth * (source.height / source.width));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not supported in this browser");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const webp = supportsWebp();
  const type = webp ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, preset.quality),
  );
  if (!blob) throw new Error("Could not compress this image");
  return new File([blob], `${name}.${webp ? "webp" : "jpg"}`, { type });
}

/** Convenience: optimise a picked file without opening the crop tool. */
export async function optimizeFile(file: File, kind: ImageKind): Promise<File> {
  const image = await loadImage(await fileToDataUrl(file));
  return renderOptimizedFile(image, kind, undefined, file.name.replace(/\.[^.]+$/, ""));
}
