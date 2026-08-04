import { useCallback, useEffect, useState } from "react";

const KEY = "grandzone-recently-viewed-v1";
const MAX = 12;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Records a product id as recently viewed for this browser/customer. */
export function recordRecentlyViewed(productId: string | null | undefined) {
  if (!productId || typeof window === "undefined") return;
  const next = [productId, ...read().filter((id) => id !== productId)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** Reads recently viewed product ids after hydration (SSR-safe). */
export function useRecentlyViewed(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
  }, []);
  return ids;
}

export function useRecordRecentlyViewed() {
  return useCallback((id: string | null | undefined) => recordRecentlyViewed(id), []);
}
