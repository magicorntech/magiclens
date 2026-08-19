import { useSyncExternalStore } from 'react'

/**
 * One shared 30s ticker instead of a `setInterval` per mounted component. Resource tables can
 * render dozens of `AgeCell`s at once; each running its own independent timer was pure overhead
 * with no benefit, since they all only need "some time has passed, re-render the relative time".
 */
const TICK_MS = 30_000

let tick = 0
let intervalId: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    intervalId = setInterval(() => {
      tick += 1
      for (const l of listeners) l()
    }, TICK_MS)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

function getSnapshot(): number {
  return tick
}

export function useSharedClockTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot)
}
