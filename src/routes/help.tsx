import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, ShieldCheck, Truck, RotateCcw, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { HelpRequest, Order } from "@/lib/store-types";
import { HELP_CATEGORIES } from "@/lib/store-types";
import { supportPhone, useStoreSettings } from "@/lib/store-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — The Grand Zone" },
      {
        name: "description",
        content: "Get help with orders, delivery, payments, cancellations and refunds at The Grand Zone. Call support or raise a help request.",
      },
      { property: "og:title", content: "Help Center — The Grand Zone" },
      { property: "og:description", content: "Call support or raise a help request for your The Grand Zone order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

const TOPICS = [
  { icon: Truck, title: "Shipping & delivery", text: "Track your order from the Orders page. Delivery estimates are shown at checkout." },
  { icon: ShieldCheck, title: "Payments", text: "Pay online securely with Razorpay (UPI, cards, netbanking) or choose Cash on Delivery." },
  { icon: RotateCcw, title: "Cancellation & refunds", text: "Cancel any order before dispatch from the order page. For a paid-order refund, raise a help request and our team will process it manually." },
  { icon: HelpCircle, title: "Coupons & offers", text: "Apply your coupon code on the checkout page before placing the order." },
];

function HelpPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const settings = useStoreSettings();
  const phone = supportPhone(settings.data);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    order_id: "__none",
    issue_category: HELP_CATEGORIES[0],
    message: "",
  });
  const [busy, setBusy] = useState(false);

  const orders = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", "help"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const myRequests = useQuery({
    enabled: !!user,
    queryKey: ["my-help-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HelpRequest[];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Please log in to send a help request");
    setBusy(true);
    const { error } = await supabase.from("help_requests").insert({
      user_id: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      order_id: form.order_id === "__none" ? null : form.order_id,
      issue_category: form.issue_category,
      message: form.message.trim(),
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Help request sent — our team will get back to you");
    setForm({ ...form, message: "", order_id: "__none" });
    qc.invalidateQueries({ queryKey: ["my-help-requests"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
      <div className="rounded-2xl bg-card p-5">
        <h1 className="text-xl font-bold">Help Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find quick answers below, chat with our assistant, or talk to a real person.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <a href={`tel:${phone}`}>
              <Phone className="mr-2 h-4 w-4" /> Call support · {phone}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="#request-help">
              <MessageCircle className="mr-2 h-4 w-4" /> Request help
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <div key={t.title} className="rounded-2xl bg-card p-4">
            <t.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-2 text-sm font-bold">{t.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
          </div>
        ))}
      </div>

      <section id="request-help" className="rounded-2xl bg-card p-5">
        <h2 className="text-lg font-bold">Request help</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what went wrong and our team will follow up. For refunds on paid orders, choose “Payment / refund”.
        </p>

        {user ? (
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div>
              <Label htmlFor="h-name">Your name</Label>
              <Input id="h-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="h-phone">Phone number</Label>
              <Input id="h-phone" required pattern="[0-9]{10}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Order (optional)</Label>
              <Select value={form.order_id} onValueChange={(v) => setForm({ ...form, order_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not about an order</SelectItem>
                  {(orders.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleDateString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue category</Label>
              <Select value={form.issue_category} onValueChange={(v) => setForm({ ...form, issue_category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HELP_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="h-msg">Message</Label>
              <Textarea id="h-msg" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm">
            <Link to="/auth" search={{ redirect: "/help" }} className="font-semibold text-primary underline">
              Log in
            </Link>{" "}
            to send a help request, or call us at{" "}
            <a href={`tel:${phone}`} className="font-semibold text-primary underline">
              {phone}
            </a>
            .
          </p>
        )}
      </section>

      {user && (myRequests.data ?? []).length > 0 ? (
        <section className="rounded-2xl bg-card p-5">
          <h2 className="text-lg font-bold">Your requests</h2>
          <div className="mt-3 space-y-2">
            {(myRequests.data ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-medium">
                  {r.issue_category} · <span className="text-muted-foreground">{r.status}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{r.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
