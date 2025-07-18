import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // Refetch every 30 seconds for real-time data
      refetchOnWindowFocus: true, // Refetch when user comes back to tab
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnReconnect: true, // Refetch when network reconnects
      staleTime: 0, // Data is immediately stale, always fetch fresh
      gcTime: 0, // Immediately garbage collect to prevent cross-user data leakage
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        return failureCount < 2; // Retry up to 2 times for other errors
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper function to clear cache for fresh data loading
export const clearUserCache = (userId?: number) => {
  // Always clear all cache to ensure fresh data
  queryClient.clear();
  console.log('Cache cleared for fresh data loading for user:', userId);
  
  // Force refresh after clear
  setTimeout(() => {
    forceRefreshAllData();
  }, 100);
};

// Helper function to invalidate specific data types
export const invalidateQueries = (queryTypes: string[]) => {
  queryTypes.forEach(queryType => {
    queryClient.invalidateQueries({ queryKey: [queryType] });
  });
};

// Helper function to force refresh all critical data
export const forceRefreshAllData = () => {
  const criticalQueries = [
    '/api/clients',
    '/api/properties', 
    '/api/applications',
    '/api/transactions',
    '/api/pool-fund',
    '/api/dashboard/stats'
  ];
  
  console.log('Forcing refresh of all critical data queries...');
  
  criticalQueries.forEach(queryKey => {
    console.log(`Invalidating and refetching: ${queryKey}`);
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    queryClient.refetchQueries({ queryKey: [queryKey] });
  });
  
  console.log('Force refresh completed for all critical data');
};
