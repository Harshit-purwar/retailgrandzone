import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { readCache, writeCache } from "./fast-cache";

/**
 * React Query wrapper that keeps the last successful response in localStorage
 * and shows it instantly on repeat visits — even on a slow connection — while
 * refetching in the background for fresh data.
 *
 * The cache is only applied after the first client mount so the SSR-rendered
 * markup (skeletons) hydrates without mismatches.
 */
export function useFastQuery<T>(options: {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const { queryKey, queryFn, enabled = true } = options;
  const [cache] = useState(() => readCache<T>(queryKey));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useQuery({
    queryKey,
    enabled,
    initialData: mounted ? cache : undefined,
    queryFn: async () => {
      const data = await queryFn();
      writeCache(queryKey, data);
      return data;
    },
  });
}
