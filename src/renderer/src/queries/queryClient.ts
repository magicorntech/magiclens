import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      /** Avoid refetch storms when remounting tabs. */
      staleTime: 10_000,
      /** Drop unused list/manifest caches so inactive cluster data does not linger in RAM. */
      gcTime: 5 * 60_000
    }
  }
})
