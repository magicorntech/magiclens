export const SEARCH_LIST_TIMEOUT_MS = 8000
export const SEARCH_HEAVY_TIMEOUT_MS = 6000
export const SEARCH_LIST_CONCURRENCY = 6
export const SEARCH_REQUEST_TIMEOUT_MS = 18_000

/** A finished search may update the list only when it is still the latest query. */
export function keepSearchResult(startedGeneration: number, currentGeneration: number): boolean {
  return startedGeneration === currentGeneration
}
