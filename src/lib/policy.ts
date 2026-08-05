import type { StoreSettings } from "@/lib/store-settings";

export const DEFAULT_CANCELLATION_FEE_PERCENT = 4;

export function cancellationFeePercent(settings?: StoreSettings | null): number {
  const value = Number(settings?.cancellation_fee_percent);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_CANCELLATION_FEE_PERCENT;
}

/**
 * Refund breakdown for a prepaid order that is cancelled or returned:
 * a small processing fee is deducted and the rest is refunded.
 */
export function refundBreakdown(total: number, percent: number) {
  const paid = Math.max(0, Number(total) || 0);
  const fee = Math.round((paid * percent) / 100);
  return { paid, fee, refund: Math.max(0, paid - fee), percent };
}
