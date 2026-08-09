import { createFileRoute } from "@tanstack/react-router";
import type { Order, OrderItem } from "@/lib/store-types";
import { orderMessage, waNumber } from "@/lib/whatsapp";

/**
 * Sends the admin a WhatsApp alert when a new order is placed.
 * Uses the Meta WhatsApp Business Cloud API; configurable via env vars:
 *   WHATSAPP_TOKEN    — a WhatsApp Cloud API access token
 *   WHATSAPP_PHONE_ID — the WhatsApp Business Phone Number ID
 * The recipient comes from store_settings.admin_whatsapp (see Delivery tab).
 *
 * Fire-and-forget: if the API is not configured (or fails) the route still
 * returns 200 so order placement is never blocked. The admin panel's realtime
 * toast remains the built-in fallback.
 */
export const Route = createFileRoute("/api/notify-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { orderId?: unknown };
        const orderId = typeof body.orderId === "string" ? body.orderId : "";
        if (!orderId) return new Response("Missing orderId", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [orderRes, itemsRes, settingsRes] = await Promise.all([
          supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle(),
          supabaseAdmin.from("order_items").select("*").eq("order_id", orderId),
          supabaseAdmin.from("store_settings").select("*").limit(1).maybeSingle(),
        ]);
        if (orderRes.error || !orderRes.data) {
          return new Response("Order not found", { status: 404 });
        }

        const settings = settingsRes.data as unknown as { admin_whatsapp?: string } | null;
        const adminNumber = (settings?.admin_whatsapp || "").trim();
        if (!adminNumber) {
          return new Response("No admin WhatsApp number configured", { status: 200 });
        }

        const token = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        if (!token || !phoneId) {
          console.warn(
            "[notify-admin] WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not set — skipping WhatsApp alert",
          );
          return new Response("WhatsApp not configured", { status: 200 });
        }

        const message = orderMessage(
          orderRes.data as unknown as Order,
          (itemsRes.data ?? []) as unknown as OrderItem[],
          true,
        );

        const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: waNumber(adminNumber),
            type: "text",
            text: { body: message },
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error("[notify-admin] WhatsApp API error:", resp.status, text.slice(0, 500));
          return new Response("WhatsApp send failed", { status: 502 });
        }
        return new Response("sent", { status: 200 });
      },
    },
  },
});
