import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Returns signed Cloudinary upload params so the browser can upload directly
 * without ever seeing the API secret. Only admins may get a signature. */
export const getCloudinaryUploadParams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ folder: z.string().max(100).default("store-images") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await (
      context as never as {
        supabase: { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };
      }
    ).supabase.rpc("is_admin");
    if (error || !isAdmin) throw new Error("Forbidden");
    const { createUploadParams } = await import("./cloudinary.server");
    return createUploadParams(data.folder);
  });
