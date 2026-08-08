import type { ImageKind } from "@/lib/image-tools";
import { optimizeFile } from "@/lib/image-tools";
import { getCloudinaryUploadParams } from "@/lib/cloudinary.functions";

/**
 * Uploads a picked file to Cloudinary and returns a long-lived URL.
 * Images are automatically resized and compressed (WebP where supported)
 * for the place they will be shown. The upload is signed server-side, so the
 * Cloudinary API secret never reaches the browser.
 */
export async function uploadStoreImage(file: File, kind: ImageKind = "product"): Promise<string> {
  let upload = file;
  try {
    upload = await optimizeFile(file, kind);
  } catch {
    /* fall back to the original file if the browser can't process it */
  }
  return uploadToCloudinary(upload);
}

/** Uploads an already-processed (cropped) file without re-optimising it. */
export async function uploadProcessedImage(file: File): Promise<string> {
  return uploadToCloudinary(file);
}

async function uploadToCloudinary(file: File): Promise<string> {
  const { cloudName, apiKey, timestamp, folder, signature } = await getCloudinaryUploadParams({
    data: { folder: "store-images" },
  });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "Cloudinary upload failed");
  }
  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!json.secure_url) throw new Error(json.error?.message || "Cloudinary upload failed");
  return json.secure_url;
}
