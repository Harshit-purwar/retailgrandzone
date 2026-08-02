import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectCurrentLocation, readSavedLocation } from "@/lib/geo";

export type Store = {
  id: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  delivery_estimate: string;
  active: boolean;
  sort_order: number;
};

const STORE_KEY = "gz-store-id";
const STORE_EVENT = "gz-store-change";

export function readSavedStoreId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function writeSavedStoreId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, id);
  window.dispatchEvent(new Event(STORE_EVENT));
}

/** Great-circle distance between two coordinates, in kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function nearestStore(stores: Store[], lat: number, lng: number) {
  let best: { store: Store; km: number } | null = null;
  for (const s of stores) {
    const km = distanceKm(lat, lng, Number(s.latitude), Number(s.longitude));
    if (!best || km < best.km) best = { store: s, km };
  }
  if (!best) return null;
  return { ...best, inRange: best.km <= Number(best.store.radius_km || 0) };
}

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Store[];
    },
  });
}

/**
 * The store the customer is shopping from. Products/banners without a store are
 * shared across every location, so the storefront keeps working while the admin
 * assigns items to branches.
 */
export function useSelectedStore() {
  const stores = useStores();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStoreId(readSavedStoreId());
    setHydrated(true);
    const sync = () => setStoreId(readSavedStoreId());
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const list = stores.data ?? [];
  const store = list.find((s) => s.id === storeId) ?? null;

  const select = useCallback((id: string) => {
    writeSavedStoreId(id);
    setStoreId(id);
  }, []);

  /** Detects GPS position and picks the closest serviceable store. */
  const detect = useCallback(async () => {
    const loc = await detectCurrentLocation();
    const match = nearestStore(list, loc.latitude, loc.longitude);
    if (match) select(match.store.id);
    return match;
  }, [list, select]);

  return {
    stores: list,
    loading: stores.isLoading,
    hydrated,
    storeId: store ? store.id : null,
    store,
    select,
    detect,
    savedLocation: readSavedLocation(),
  };
}

/** Adds the "this store or shared" filter to a products/banners query. */
export function scopeToStore<T extends { or: (f: string) => T }>(query: T, storeId: string | null): T {
  if (!storeId) return query;
  return query.or(`store_id.is.null,store_id.eq.${storeId}`);
}
