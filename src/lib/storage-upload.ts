import { supabase } from "@/integrations/supabase/client";

const BUCKET = "store-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads a picked file to the store bucket and returns a long-lived URL. */
export async function uploadStoreImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
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
