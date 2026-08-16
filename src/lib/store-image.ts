const CLOUDINARY = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//i;

/**
 * Returns an optimized URL for a product/store image at the given display width.
 * - Cloudinary URLs get responsive params injected directly (no proxy).
 * - Everything else (Amazon, Flipkart, Supabase, …) is routed through the
 *   images.weserv.nl CDN, which resizes to `width`, converts to WebP and caches
 *   for a year, cutting payloads by 90%+.
 */
export function storeImageUrl(src: string | null | undefined, width: number): string {
  if (!src) return "";
  const s = src.trim();
  if (!/^https?:\/\//i.test(s)) return s;

  const cloud = s.match(CLOUDINARY);
  if (cloud) {
    const rest = s.slice(cloud[0].length).split("/");
    let chain = "";
    let remainder = rest;
    if (rest[0] && !/^v\d+/.test(rest[0])) {
      chain = rest[0];
      remainder = rest.slice(1);
    }
    const clean = chain
      .replace(/w_\d+/gi, "")
      .replace(/f_auto|q_auto/gi, "")
      .replace(/,,+/g, ",")
      .replace(/^,|,$/g, "");
    const wanted = `f_auto,q_auto,w_${width}`;
    const nextChain = clean ? `${clean},${wanted}` : wanted;
    return `${cloud[0]}${nextChain}/${remainder.join("/")}`;
  }

  return `https://images.weserv.nl/?url=${encodeURIComponent(s)}&w=${width}&output=webp&maxage=31536000`;
}
