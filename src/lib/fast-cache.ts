const PREFIX = "gz-fast:";

/** Hard ceiling on cached payloads so localStorage never blows past quota. */
const MAX_CACHE_BYTES = 1_500_000;

function cacheKey(parts: unknown[]): string {
  return PREFIX + parts.map((p) => String(p)).join("::");
}

export function readCache<T>(parts: unknown[]): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(cacheKey(parts));
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(parts: unknown[], data: T): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(data);
    if (raw.length > MAX_CACHE_BYTES) return;
    localStorage.setItem(cacheKey(parts), raw);
  } catch {
    /* storage quota exceeded — cache is best-effort */
  }
}
