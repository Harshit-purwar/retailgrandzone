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
price (number, INR), mrp (number, INR), seo_title (<60 chars), seo_description (<160 chars),
seo_keywords (comma separated), images (array of absolute image URLs if known, else []).`;

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

    const imageUrls = Array.from(page.matchAll(/https?:\/\/[^"'\s]+?\.(?:jpg|jpeg|png|webp)/gi))
      .map((m) => m[0])
      .filter((u) => !/sprite|logo|icon|pixel/i.test(u))
      .slice(0, 8);

    const text = page
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 12000);

    const draft = await askAI(
      `You extract product data from a retailer page and rewrite it as original marketing copy (never copy text verbatim).
Prices are in INR. Pick the best matching category from: ${data.categories.join(", ") || "any"}.
${SHAPE}`,
      `Source URL: ${data.url}\nCandidate image URLs: ${imageUrls.join(", ") || "none"}\n\nPage text:\n${text || "(page could not be fetched — infer from the URL)"}`,
    );

    return { ...draft, images: draft.images.length ? draft.images : imageUrls };
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
