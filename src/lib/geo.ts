import { useCallback, useEffect, useState } from "react";

export type SavedLocation = {
  label: string;
  latitude: number;
  longitude: number;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

const LABEL_KEY = "gz-location";
const COORDS_KEY = "gz-location-full";

export function readSavedLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as SavedLocation) : null;
  } catch {
    return null;
  }
}

export function writeSavedLocation(loc: SavedLocation) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COORDS_KEY, JSON.stringify(loc));
  localStorage.setItem(LABEL_KEY, loc.label);
  window.dispatchEvent(new Event("gz-location-change"));
}

/** Asks the browser for GPS coordinates and reverse-geocodes them into an address. */
export async function detectCurrentLocation(): Promise<SavedLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Location is not supported on this device");
  }
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Location permission denied")), {
      enableHighAccuracy: true,
      timeout: 15000,
    });
  });

  const { latitude, longitude } = pos.coords;
  let city = "";
  let state = "";
  let pincode = "";
  let locality = "";
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    const json = (await res.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      postcode?: string;
      localityInfo?: { administrative?: { name?: string }[] };
    };
    locality = json.locality ?? "";
    city = json.city || json.locality || "";
    state = json.principalSubdivision ?? "";
    pincode = json.postcode ?? "";
  } catch {
    /* keep raw coordinates when reverse geocoding is unavailable */
  }

  const label = [locality || city, state].filter(Boolean).join(", ") || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

  const loc: SavedLocation = {
    label,
    latitude,
    longitude,
    address_line: locality,
    city,
    state,
    pincode,
  };
  writeSavedLocation(loc);
  return loc;
}

/** Reactive access to the saved delivery location. */
export function useSavedLocation() {
  const [location, setLocation] = useState<SavedLocation | null>(null);

  useEffect(() => {
    setLocation(readSavedLocation());
    const sync = () => setLocation(readSavedLocation());
    window.addEventListener("gz-location-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gz-location-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const refresh = useCallback(async () => {
    const next = await detectCurrentLocation();
    setLocation(next);
    return next;
  }, []);

  return { location, refresh };
}
