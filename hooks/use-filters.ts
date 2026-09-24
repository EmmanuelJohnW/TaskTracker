"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import { parseFilters, writeFilters, type TaskFilters } from "@/lib/tasks/filters"

/** Filters live in the URL so every view is shareable and bookmarkable. */
export function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])

  const setFilters = useCallback(
    (patch: Partial<TaskFilters>) => {
      const next = writeFilters(searchParams, patch).toString()
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return { filters, setFilters, setParam, searchParams }
}
