"use client"

import { createContext, use, useCallback, useMemo, useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import type { ActionResult } from "@/lib/actions/result"
import type { AppData } from "@/lib/data/app-data"
import { applyOptimistic, type OptimisticAction } from "@/lib/tasks/optimistic"

interface MutateOptions {
  optimistic?: OptimisticAction
  success?: string
}

interface AppDataContextValue extends AppData {
  /**
   * Applies an optimistic change, runs the server action, and toasts the
   * outcome. The optimistic state falls away once the refreshed server data
   * arrives (or immediately, on failure).
   */
  mutate: <T>(run: () => Promise<ActionResult<T>>, options?: MutateOptions) => Promise<ActionResult<T>>
  isPending: boolean
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  const [tasks, addOptimistic] = useOptimistic(data.tasks, applyOptimistic)
  const [isPending, startTransition] = useTransition()

  const mutate = useCallback(
    <T,>(run: () => Promise<ActionResult<T>>, options: MutateOptions = {}) =>
      new Promise<ActionResult<T>>((resolve) => {
        startTransition(async () => {
          if (options.optimistic) addOptimistic(options.optimistic)
          let result: ActionResult<T>
          try {
            result = await run()
          } catch {
            result = { success: false, error: "Network error. Please try again." }
          }
          if (!result.success) toast.error(result.error)
          else if (options.success) toast.success(options.success)
          resolve(result)
        })
      }),
    [addOptimistic]
  )

  const value = useMemo(
    () => ({ ...data, tasks, mutate, isPending }),
    [data, tasks, mutate, isPending]
  )
  return <AppDataContext value={value}>{children}</AppDataContext>
}

export function useAppData(): AppDataContextValue {
  const context = use(AppDataContext)
  if (!context) throw new Error("useAppData must be used inside AppDataProvider")
  return context
}
