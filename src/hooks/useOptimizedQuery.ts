import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Query result caching configuration
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T, Error, T, string[]>>
) {
  return useQuery<T, Error, T, string[]>({
    queryKey,
    queryFn,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    ...options,
  });
}
