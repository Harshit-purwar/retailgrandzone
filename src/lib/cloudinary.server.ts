/** Server-only Cloudinary helpers (never imported from client code directly). */

import crypto from "node:crypto";

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const missing = [
    !cloudName && "CLOUDINARY_CLOUD_NAME",
    !apiKey && "CLOUDINARY_API_KEY",
    !apiSecret && "CLOUDINARY_API_SECRET",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Image uploads are unavailable: missing server environment variable(s) ${missing.join(", ")}. Add them to the deployment environment and redeploy.`,
    );
  }
  return { cloudName: cloudName!, apiKey: apiKey!, apiSecret: apiSecret! };
}

/**
 * Builds the signed upload parameters for a browser-side Cloudinary upload.
 * The API secret never leaves the server: the client receives only the
 * signature it needs for this one upload.
 */
export function createUploadParams(folder = "store-images"): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
} {
  const { cloudName, apiKey, apiSecret } = config();
  const timestamp = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = { folder, timestamp: String(timestamp) };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  // Cloudinary signs with a plain hash of (string_to_sign + api_secret), NOT an HMAC.
  const signature = crypto
    .createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
  return { cloudName, apiKey, timestamp, folder, signature };
}
