"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { useTaskEditor } from "@/components/task/task-editor-provider"

const TASK_PARAM = "task"

/** Opens `?task=<id>` (used by notification taps) in the editor, then tidies the URL. */
export function useTaskDeepLink() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { openTask } = useTaskEditor()
  const taskId = searchParams.get(TASK_PARAM)

  useEffect(() => {
    if (!taskId) return
    openTask(taskId)
    const next = new URLSearchParams(searchParams.toString())
    next.delete(TASK_PARAM)
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [taskId, openTask, router, pathname, searchParams])
}
