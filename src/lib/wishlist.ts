import { useCallback, useEffect, useState } from "react";

const KEY = "grandzone-wishlist-v1";
const MAX = 60;

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

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("gz-wishlist-change"));
  } catch {
    /* storage unavailable */
  }
}

/** Toggles a product id in this browser's wishlist. Returns the new state. */
export function toggleWishlist(productId: string): boolean {
  const next = read();
  const idx = next.indexOf(productId);
  if (idx >= 0) next.splice(idx, 1);
  else next.unshift(productId);
  const list = next.slice(0, MAX);
  write(list);
  return idx < 0;
}

export function isWishlisted(productId: string): boolean {
  return read().includes(productId);
}

/** Reactive access to the wishlist ids (SSR-safe, hydrates on mount). */
export function useWishlist(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener("gz-wishlist-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gz-wishlist-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ids;
}

export function useToggleWishlist() {
  return useCallback((productId: string) => toggleWishlist(productId), []);
}
