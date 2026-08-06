import { CANCELLED_BY_CUSTOMER } from "@/lib/store-types";

export type OrderState = "successful" | "failed" | "pending" | "cancelled";

type MinimalOrder = {
  payment_method: string;
  payment_status: string;
  status: string;
};

/** True when the order was paid online (rather than cash on delivery). */
export function isOnlinePayment(order: MinimalOrder): boolean {
  return /razorpay|online|upi|card|netbanking/i.test(order.payment_method ?? "");
}

/**
 * Single source of truth for "is this order successful?".
 * An online order is only successful once Razorpay confirms the payment;
 * COD orders are successful as soon as they are placed.
 */
export function orderState(order: MinimalOrder): OrderState {
  const pay = (order.payment_status ?? "").toLowerCase();
  const status = order.status ?? "";
  if (status === "Cancelled" || status === CANCELLED_BY_CUSTOMER) return "cancelled";
  if (pay === "failed" || status === "Payment Failed") return "failed";
  if (isOnlinePayment(order)) return pay === "paid" ? "successful" : "pending";
  return "successful";
}

export function orderStateLabel(state: OrderState): string {
  switch (state) {
    case "successful":
      return "Order successful";
    case "failed":
      return "Order failed";
    case "pending":
      return "Payment pending";
    default:
      return "Order cancelled";
  }
}
