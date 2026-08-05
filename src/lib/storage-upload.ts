import { supabase } from "@/integrations/supabase/client";
import type { ImageKind } from "@/lib/image-tools";
import { optimizeFile } from "@/lib/image-tools";

const BUCKET = "store-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/**
 * Uploads a picked file to the store bucket and returns a long-lived URL.
 * Images are automatically resized and compressed (WebP where supported)
 * for the place they will be shown.
 */
export async function uploadStoreImage(file: File, kind: ImageKind = "product"): Promise<string> {
  let upload = file;
  try {
    upload = await optimizeFile(file, kind);
  } catch {
    /* fall back to the original file if the browser can't process it */
  }

  const ext = upload.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, upload, {
    cacheControl: "31536000",
    upsert: false,
    contentType: upload.type || undefined,
  });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create image URL");
  return data.signedUrl;
}

/** Uploads an already-processed (cropped) file without re-optimising it. */
export async function uploadProcessedImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create image URL");
  return data.signedUrl;
}
