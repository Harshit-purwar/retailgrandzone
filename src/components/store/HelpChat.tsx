import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, X, Send, Loader2, Sparkles, Phone, LifeBuoy } from "lucide-react";
import { supportPhone, useStoreSettings } from "@/lib/store-settings";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Delivery kitne time mein hoti hai?",
  "How do I use a coupon code?",
  "Cash on delivery available hai?",
  "How can I track my order?",
];

const UNSURE = [
  "i don't know",
  "i do not know",
  "not sure",
  "sorry",
  "can't help",
  "cannot help",
  "unable to",
];

export function HelpChat() {
  const settings = useStoreSettings();
  const phone = supportPhone(settings.data);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm the Grand Zone help assistant. Ask me about delivery, payments, coupons, returns or finding a product.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        throw new Error(
          res.status === 429
            ? "Too many requests, please try again in a moment."
            : "Chat is unavailable right now.",
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              answer += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: answer };
                return copy;
              });
            }
          } catch {
            /* ignore partial frames */
          }
        }
      }

      const lower = answer.toLowerCase();
      const unsure = !answer || UNSURE.some((u) => lower.includes(u));
      const fallback = `Need more help? Call us at ${phone}.`;

      if (!answer) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `Sorry, I couldn't answer that. ${fallback}`,
          };
          return copy;
        });
      } else if (unsure && !answer.includes(phone)) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `${answer}\n\n${fallback}` };
          return copy;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `${message}\n\nNeed more help? Call us at ${phone}.`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        className="fixed bottom-[8.5rem] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:bottom-4 sm:h-14 sm:w-14"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-[9.75rem] z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-20 sm:right-4 sm:w-[380px]">
          <div className="flex items-center gap-2 bg-brand px-4 py-3 text-brand-foreground">
            <Sparkles className="h-4 w-4" />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Help &amp; Support</p>
              <p className="text-[11px] opacity-80">AI assistant · replies instantly</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground"
                }
              >
                {m.content ||
                  (busy && i === messages.length - 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null)}
              </div>
            ))}

            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-border px-2 py-2">
            <a
              href={`tel:${phone}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
            >
              <Phone className="h-3.5 w-3.5" /> Call {phone}
            </a>
            <Link
              to="/help"
              onClick={() => setOpen(false)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Request help
            </Link>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              aria-label="Your message"
              className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
