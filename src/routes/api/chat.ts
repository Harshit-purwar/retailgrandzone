import { createFileRoute } from "@tanstack/react-router";
import { postChatCompletion } from "@/lib/ai-config";

type ChatMessage = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: ChatMessage[] };
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const system = [
          "You are the friendly support assistant for The Grand Zone, an online store in India.",
          "Help shoppers with orders, delivery, payments (Cash on Delivery and online payments), coupons, returns and finding products.",
          "Prices are in Indian Rupees. Keep answers short, warm and practical (2-4 sentences).",
          "You can reply in English or Hinglish, matching the customer's language.",
          "Refunds are processed manually by our team: ask the customer to raise a request in the Help Center (Payment / refund).",
          "If you cannot answer a question, or it needs a human, reply with exactly this sentence at the end: 'Need more help? Call us at 6392480868.'",
          "If you do not know an order-specific detail, ask them to check the Orders page or the Help Center.",
        ].join(" ");

        const upstream = await postChatCompletion({
          model: "",
          stream: true,
          messages: [{ role: "system", content: system }, ...messages.slice(-14)],
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text();
          return new Response(text || "AI request failed", { status: upstream.status || 500 });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
