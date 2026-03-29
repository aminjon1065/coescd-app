'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Wraps the application in a React Query context.
 *
 * QueryClient is created inside useState so it is stable across re-renders but
 * still isolated per server-render request (Next.js App Router requirement for
 * client components).
 *
 * Default config choices:
 *  - staleTime 60 s   — data fetched within the last minute is served from
 *                       cache without a network request, eliminating the
 *                       "every navigation re-fetches everything" problem.
 *  - gcTime    5 min  — inactive queries stay in cache for 5 minutes so a
 *                       quick back-navigation feels instant.
 *  - retry 1          — one automatic retry on network error; avoids hammering
 *                       the server on hard failures.
 *  - refetchOnWindowFocus true (React Query default) — silently refreshes
 *                       stale data when the user returns to the tab.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1_000 * 60,      // 1 minute
            gcTime: 1_000 * 60 * 5,     // 5 minutes
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools panel is only included in development builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
