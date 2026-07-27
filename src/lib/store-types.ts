export type Product = {
  id: string;
  title: string;
  slug: string | null;
  brand: string;
  category: string;
  description: string;
  price: number;
  mrp: number;
  image_url: string;
  images: unknown;
  rating: number;
  rating_count: number;
  stock: number;
  highlights: unknown;
  specs: unknown;
  active: boolean;
  created_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  image_url: string;
  placement: string;
  product_id: string | null;
  link_category: string | null;
  sort_order: number;
  active: boolean;
};

export type Order = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
};

export const ORDER_STATUSES = ["Ordered", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled"];

export function inr(value: number): string {
  return "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN");
}

export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

export function toSpecs(value: unknown): [string, string][] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]);
  }
  return [];
}
