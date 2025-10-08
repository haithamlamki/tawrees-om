import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Query result caching configuration
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 2 * 60 * 1000; // 2 minutes

export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T>>
) {
  return useQuery<T>({
    queryKey,
    queryFn,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Optimized list queries with pagination
export function useOptimizedListQuery<T>(
  table: string,
  columns: string = '*',
  filters?: Record<string, any>,
  limit: number = 50
) {
  return useOptimizedQuery(
    ['list', table, JSON.stringify(filters), limit],
    async () => {
      let query = supabase.from(table).select(columns).limit(limit);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as T;
    }
  );
}

// Prefetch helper for better UX
export async function prefetchQuery(
  queryKey: string[],
  queryFn: () => Promise<any>
) {
  const queryClient = (await import('@tanstack/react-query')).QueryClient;
  const client = new queryClient();
  
  await client.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: STALE_TIME,
  });
}
