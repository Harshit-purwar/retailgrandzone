import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { postChatCompletion } from "@/lib/ai-config";

const draftSchema = z.object({
  title: z.string().default(""),
  brand: z.string().default(""),
  category: z.string().default(""),
  description: z.string().default(""),
  highlights: z.array(z.string()).default([]),
  specs: z.record(z.string(), z.string()).default({}),
  warranty: z.string().default(""),
  colors: z.array(z.string()).default([]),
  price: z.number().default(0),
  mrp: z.number().default(0),
  seo_title: z.string().default(""),
  seo_description: z.string().default(""),
  seo_keywords: z.string().default(""),
  images: z.array(z.string()).default([]),
});

export type ProductDraft = z.infer<typeof draftSchema>;

async function assertAdmin(context: {
  supabase: { rpc: (fn: string) => Promise<{ data: unknown }> };
}) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Forbidden");
}

async function askAI(system: string, user: string): Promise<ProductDraft> {
  const res = await postChatCompletion({
    model: "",
    messages: [
      { role: "system", content: `${system} Reply ONLY with a JSON object, no markdown fences.` },
      { role: "user", content: user },
    ],
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429)
      throw new Error("AI is busy right now (rate limited). Please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits are exhausted. Add credits to continue using AI tools.");
    if (res.status === 401 || res.status === 403)
      throw new Error("AI key rejected — check AI_API_KEY on the server.");
    throw new Error(body || "AI request failed");
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }
  return draftSchema.parse(parsed);
}

const SHAPE = `Return JSON with keys: title, brand, category, description (150-300 words),
highlights (array of 5-8 short bullet strings), specs (object of spec name -> value),
warranty (e.g. "1 year manufacturer warranty"), colors (array of colour names),
price (number, INR, the actual selling price), mrp (number, INR, the original or strike-through price, must be >= price),
seo_title (<60 chars), seo_description (<160 chars), seo_keywords (comma separated),
images (array of absolute image URLs if known, else []).`;

type PageStructured = {
  title?: string;
  brand?: string;
  price?: number;
  currency?: string;
  description?: string;
  images: string[];
};

function parseMetaTags(page: string): Record<string, string> {
  const metas: Record<string, string> = {};
  for (const tag of page.matchAll(/<meta[^>]*>/gi)) {
    const html = tag[0];
    const key = html.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = html.match(/content=["']([^"']*)["']/i)?.[1];
    if (key && content !== undefined) metas[key] = content;
  }
  return metas;
}

const IMAGE_JUNK =
  /sprite|logo|icon|pixel|banner|badge|tracker|placeholder|data:image|favicon|avatar/i;

/** Collects real product image URLs from <img> tags, srcset, hi-res attrs and og/twitter meta. */
function extractImageCandidates(page: string): string[] {
  const found = new Set<string>();
  const add = (u: string | undefined | null) => {
    if (!u) return;
    const url = u.trim().replace(/^["']|["']$/g, "");
    if (/^https?:\/\//i.test(url)) found.add(url);
  };

  for (const tag of page.matchAll(/<img[^>]*>/gi)) {
    const html = tag[0];
    for (const attr of ["data-a-hires", "data-hires", "data-src", "data-original", "src"]) {
      const m = html.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
      if (m) add(m[1]);
    }
    const srcset = html.match(/srcset=["']([^"']+)["']/i);
    if (srcset) {
      const first = srcset[1].split(",")[0]?.trim().split(" ")[0];
      add(first);
    }
  }

  const metas = parseMetaTags(page);
  add(metas["og:image"]);
  add(metas["og:image:secure_url"]);
  add(metas["twitter:image"]);

  for (const m of page.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const u = m[0].replace(/[)\]},;]+$/, "");
    if (/\.(?:jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(u)) add(u);
  }

  return [...found].filter((u) => !IMAGE_JUNK.test(u)).slice(0, 12);
}

/** Extracts reliable product facts (JSON-LD Product schema + og/meta tags) from a page. */
function extractStructuredData(page: string): PageStructured {
  const out: PageStructured = { images: [] };
  const ldBlocks = page.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of ldBlocks ?? []) {
    const raw = block
      .replace(/<script[^>]*>/gi, "")
      .replace(/<\/script>/gi, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as Record<string, unknown>;
      if (
        !String(n["@type"] ?? "")
          .toLowerCase()
          .includes("product")
      )
        continue;
      if (!out.title && typeof n.name === "string") out.title = n.name.trim().slice(0, 300);
      if (!out.brand) {
        if (typeof n.brand === "string") out.brand = n.brand.trim();
        else if (n.brand && typeof n.brand === "object") {
          const b = (n.brand as Record<string, unknown>).name;
          if (typeof b === "string") out.brand = b.trim();
        }
      }
      if (!out.description && typeof n.description === "string")
        out.description = n.description.trim().slice(0, 2000);
      const offers = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      if (offers && typeof offers === "object") {
        const o = offers as Record<string, unknown>;
        if (out.price === undefined) {
          for (const key of ["price", "lowPrice"]) {
            const p = Number(o[key]);
            if (Number.isFinite(p) && p > 0) {
              out.price = p;
              break;
            }
          }
        }
        if (!out.currency && typeof o.priceCurrency === "string") out.currency = o.priceCurrency;
      }
      if (n.image) {
        const imgs = Array.isArray(n.image) ? n.image : [n.image];
        for (const im of imgs) {
          const url = typeof im === "string" ? im : (im as Record<string, unknown>)?.url;
          if (typeof url === "string" && /^https?:\/\//i.test(url)) out.images.push(url);
        }
      }
    }
  }

  const metas = parseMetaTags(page);
  if (!out.title) out.title = metas["og:title"]?.trim();
  if (!out.description) out.description = metas["og:description"]?.trim();
  if (out.price === undefined) {
    const amt = Number(metas["product:price:amount"]);
    if (Number.isFinite(amt) && amt > 0) out.price = amt;
  }
  if (!out.currency) out.currency = metas["product:price:currency"];
  if (out.images.length === 0 && metas["og:image"]?.startsWith("http"))
    out.images.push(metas["og:image"]);

  if (out.images.length === 0) out.images = extractImageCandidates(page);
  out.images = [...new Set(out.images)].slice(0, 8);
  return out;
}

const BLOCKED_MARKERS =
  /robot|captcha|enter the characters|api-services-support|are you a human|cookies for best|unusual traffic|pardon our interruption|access denied/i;

/** Amazon/Flipkart answer server-side fetches with a bot-check page; detect that. */
function looksBlocked(page: string): boolean {
  return page.length < 5000 || BLOCKED_MARKERS.test(page);
}

/** Fetches a page through the Jina Reader proxy, which bypasses retailer bot checks. */
async function fetchJinaReader(url: string): Promise<string> {
  const res = await fetch("https://r.jina.ai/" + encodeURIComponent(url), {
    signal: AbortSignal.timeout(30000),
    headers: {
      "x-respond-with": "markdown",
      "x-timeout": "20",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    },
  });
  if (!res.ok) return "";
  return await res.text();
}

/** Extracts image URLs from markdown (Jina Reader output). */
function extractMarkdownImages(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi)).map((m) => m[1]);
}

/** Normalizes image URLs: Amazon thumbnails → full size, Flipkart → hi-res, dedupes. */
function normalizeImages(list: string[]): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const u = raw.trim().replace(/^["']|["']$/g, "");
    if (!/^https?:\/\//i.test(u)) continue;
    const amazon = u.match(/^(https?:\/\/m\.media-amazon\.com\/images\/I\/[^.]+)/i);
    if (amazon) {
      out.push(`${amazon[1]}.jpg`);
      continue;
    }
    const looksLikeImage =
      /\.(?:jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(u) || /\/images\//i.test(u);
    if (!looksLikeImage) continue;
    if (/images\/(?:G|S)\//i.test(u)) continue;
    out.push(u.replace(/\/image\/\d{2,4}\/\d{2,4}\//i, "/image/832/832/"));
  }
  return [...new Set(out)].filter((u) => !IMAGE_JUNK.test(u)).slice(0, 8);
}

/** ✨ Generate a full product draft from a short prompt. */
export const generateProductDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        prompt: z.string().min(2).max(2000),
        categories: z.array(z.string()).max(60).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return await askAI(
      `You are a catalogue copywriter for an Indian e-commerce store. Prices are in INR.
Pick the best matching category from this list when possible: ${data.categories.join(", ") || "any"}.
${SHAPE}`,
      `Create a complete product listing for: ${data.prompt}`,
    );
  });

/** 🔗 Import product details from a brand / Amazon / Flipkart product URL. */
export const importProductFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        url: z.string().url().max(2000),
        categories: z.array(z.string()).max(60).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    let page = "";
    try {
      const res = await fetch(data.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: {
          // Retailer pages block unknown bots; a normal desktop browser
          // signature works from serverless runtimes too.
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-IN,en;q=0.9",
        },
      });
      if (res.ok) page = await res.text();
    } catch {
      /* the page may block bots — fall back to the URL alone */
    }

    // Amazon/Flipkart usually answer with a bot-check page; fetch the real
    // content through the Jina Reader proxy when the direct fetch looks blocked.
    const blocked = !page || looksBlocked(page);
    let reader = "";
    if (blocked) {
      try {
        reader = await fetchJinaReader(data.url);
      } catch {
        /* Jina may be down — keep whatever we have */
      }
    }

    const imageUrls = normalizeImages([
      ...(blocked ? [] : extractImageCandidates(page)),
      ...extractMarkdownImages(reader),
    ]);

    const sourceText = blocked ? reader : page;
    const text = sourceText
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 12000);

    const structured = blocked ? ({ images: [] } as PageStructured) : extractStructuredData(page);

    const draft = await askAI(
      `You extract product data from a retailer page. A structured extract from the page (JSON-LD / meta tags) is provided — treat it as GROUND TRUTH for title, brand, price and images. Do not invent or change those. Use the page text only to fill in description, specs, highlights and warranty, and rewrite it as original marketing copy (never copy verbatim).
Prices are in INR — if the structured price is not in INR, convert it. price is the selling price, mrp must be >= price.
Pick the best matching category from: ${data.categories.join(", ") || "any"}.
${SHAPE}`,
      `Source URL: ${data.url}
Structured facts (ground truth): ${JSON.stringify(structured) || "none"}
Candidate image URLs: ${imageUrls.join(", ") || "none"}
\n\nPage text:\n${text || "(page could not be fetched — infer only the title and brand from the URL, set price/mrp/images to sensible values or 0/[])"}`,
    );

    const price = draft.price > 0 ? draft.price : (structured.price ?? 0);
    const mrp = draft.mrp >= price && draft.mrp > 0 ? draft.mrp : price;
    const images = normalizeImages([...draft.images, ...structured.images, ...imageUrls]).slice(
      0,
      8,
    );

    return { ...draft, price, mrp, images };
  });

/** ✨ Improve an existing draft (better copy, richer specs, SEO). */
export const improveProductDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        draft: z.record(z.string(), z.unknown()),
        categories: z.array(z.string()).max(60).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return await askAI(
      `You improve e-commerce listings: sharper description, complete specs, persuasive highlights, strong SEO.
Keep factual details intact. Pick the best matching category from: ${data.categories.join(", ") || "any"}.
${SHAPE}`,
      `Improve this listing:\n${JSON.stringify(data.draft)}`,
    );
  });
