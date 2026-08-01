import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { inr } from "@/lib/store-types";
import { deliveryEstimate, useStoreSettings } from "@/lib/store-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Profile = { id: string; email: string | null; full_name: string | null };

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  address_line: "",
  city: "",
  state: "",
  pincode: "",
};

/** Lets the admin place an order for a customer exactly like a storefront order. */
export function NewOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const settings = useStoreSettings();
  const [customerId, setCustomerId] = useState<string>("__new");
  const [form, setForm] = useState({ ...emptyForm });
  const [payment, setPayment] = useState("COD");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(false);

  const customers = useQuery({
    enabled: open,
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,email,full_name").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });

  const products = useQuery({
    enabled: open,
    queryKey: ["admin", "products", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("title");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const list = useMemo(() => {
    const all = products.data ?? [];
    const q = term.trim().toLowerCase();
    return q ? all.filter((p) => p.title.toLowerCase().includes(q)) : all.slice(0, 30);
  }, [products.data, term]);

  const chosen = (products.data ?? []).filter((p) => (qty[p.id] ?? 0) > 0);
  const total = chosen.reduce((sum, p) => sum + Number(p.price) * (qty[p.id] ?? 0), 0);

  function set(key: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function bump(id: string, delta: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  }

  function reset() {
    setForm({ ...emptyForm });
    setQty({});
    setCustomerId("__new");
    setPayment("COD");
    setPaymentStatus("Pending");
    setTerm("");
  }

  async function create() {
    if (chosen.length === 0) return toast.error("Add at least one product");
    if (!form.full_name.trim() || !form.phone.trim()) return toast.error("Customer name and phone are required");
    setBusy(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: customerId === "__new" ? null : customerId,
        email: form.email || null,
        full_name: form.full_name,
        phone: form.phone,
        address_line: form.address_line,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        total,
        discount: 0,
        delivery_fee: 0,
        payment_method: payment,
        payment_status: paymentStatus,
        status: "Ordered",
        delivery_estimate: deliveryEstimate(settings.data),
      } as never)
      .select()
      .single();

    if (error || !order) {
      setBusy(false);
      return toast.error(error?.message ?? "Could not create order");
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      chosen.map((p) => ({
        order_id: (order as { id: string }).id,
        product_id: p.id,
        title: p.title,
        image_url: p.image_url,
        price: p.price,
        quantity: qty[p.id],
      })) as never,
    );
    setBusy(false);
    if (itemsError) return toast.error(itemsError.message);

    toast.success("Order created");
    reset();
    onCreated();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create order for a customer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Select
              value={customerId}
              onValueChange={(v) => {
                setCustomerId(v);
                const c = (customers.data ?? []).find((p) => p.id === v);
                if (c) setForm((f) => ({ ...f, full_name: c.full_name ?? f.full_name, email: c.email ?? "" }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new">+ New customer (enter details below)</SelectItem>
                {(customers.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ao-name">Full name</Label>
              <Input id="ao-name" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div>
              <Label htmlFor="ao-phone">Phone</Label>
              <Input id="ao-phone" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ao-email">Email (optional)</Label>
              <Input id="ao-email" value={form.email} onChange={set("email")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ao-address">Address</Label>
              <Input id="ao-address" value={form.address_line} onChange={set("address_line")} />
            </div>
            <div>
              <Label htmlFor="ao-city">City</Label>
              <Input id="ao-city" value={form.city} onChange={set("city")} />
            </div>
            <div>
              <Label htmlFor="ao-state">State</Label>
              <Input id="ao-state" value={form.state} onChange={set("state")} />
            </div>
            <div>
              <Label htmlFor="ao-pin">Pincode</Label>
              <Input id="ao-pin" value={form.pincode} onChange={set("pincode")} />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">Cash on delivery</SelectItem>
                  <SelectItem value="Razorpay">Razorpay (paid online)</SelectItem>
                  <SelectItem value="UPI">UPI (offline)</SelectItem>
                  <SelectItem value="Cash">Cash (in store)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Products</Label>
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {list.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded border border-border p-2 text-sm">
                  <img src={p.image_url} alt={p.title} className="h-10 w-10 object-contain" />
                  <div className="flex-1">
                    <p className="line-clamp-1 font-medium">{p.title}</p>
                    <p className="text-muted-foreground">{inr(Number(p.price))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => bump(p.id, -1)} aria-label="Decrease">
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center">{qty[p.id] ?? 0}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => bump(p.id, 1)} aria-label="Increase">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold">Total {inr(total)}</span>
            <Button disabled={busy} onClick={create}>
              {busy ? "Creating…" : "Create order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
