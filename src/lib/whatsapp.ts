import type { Order, OrderItem } from "@/lib/store-types";
import { inr } from "@/lib/store-types";

/** Normalises an Indian phone number into wa.me format (91XXXXXXXXXX). */
export function waNumber(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10) return digits.slice(-12);
  return digits;
}

/** Full, human-readable order summary used for WhatsApp notifications. */
export function orderMessage(order: Order, items: OrderItem[], forAdmin: boolean): string {
  const lines = items.map((i) => `• ${i.title} × ${i.quantity} — ${inr(Number(i.price) * i.quantity)}`);
  return [
    forAdmin ? "*New order — The Grand Zone*" : "*Your The Grand Zone order*",
    `Order ID: ${order.id.slice(0, 8).toUpperCase()}`,
    `Placed: ${new Date(order.created_at).toLocaleString("en-IN")}`,
    "",
    "*Items*",
    ...lines,
    "",
    `Payment: ${order.payment_method} (${order.payment_status})`,
    `Total: ${inr(Number(order.total))}`,
    "",
    "*Delivery*",
    `${order.full_name} · ${order.phone}`,
    `${order.address_line}, ${order.city}, ${order.state} — ${order.pincode}`,
    order.delivery_estimate ? `Delivery estimate: ${order.delivery_estimate}` : "",
    "",
    forAdmin ? "Please confirm and process this order." : "Thank you for shopping with The Grand Zone!",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * Fire-and-forget WhatsApp notification to the store admin for a successful
 * order. Uses a click-to-send wa.me link opened in a new tab (no paid API).
 */
export function openAdminWhatsApp(order: Order, items: OrderItem[], phone: string): void {
  if (typeof window === "undefined") return;
  window.open(waLink(phone, orderMessage(order, items, true)), "_blank", "noopener");
}
