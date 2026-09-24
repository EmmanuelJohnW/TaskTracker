"use client"

import { useSyncExternalStore } from "react"

const TICK_MS = 60_000

let current: Date | null = null
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    current = new Date() // may be stale if every subscriber had unmounted
    timer = setInterval(() => {
      current = new Date()
      listeners.forEach((notify) => notify())
    }, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

function getSnapshot(): Date {
  current ??= new Date()
  return current
}

/**
 * The current time in the viewer's timezone, refreshed every minute. Returns
 * null during SSR and hydration so date-relative UI ("Today", overdue colours)
 * is only ever computed in the browser's local time.
 */
export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
