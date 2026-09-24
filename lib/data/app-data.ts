import "server-only"

import { logError } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"
import {
  isPriority,
  isStatus,
  type Project,
  type Tag,
  type TaskWithRelations,
  type Workspace,
} from "@/lib/tasks/types"

export interface AppData {
  workspaces: Workspace[]
  projects: Project[]
  tags: Tag[]
  tasks: TaskWithRelations[]
}

const TASK_SELECT = "*, subtasks(*), task_tags(tags(*))"

/**
 * Loads everything the signed-in user's views need in one round of parallel
 * queries. A personal tracker holds hundreds of tasks, not millions, so
 * filtering happens client-side against the URL for instant feedback.
 */
export async function loadAppData(): Promise<AppData> {
  const supabase = await createClient()
  const [workspaces, projects, tags, tasks] = await Promise.all([
    supabase.from("workspaces").select("*").order("position").order("created_at"),
    supabase.from("projects").select("*").order("created_at"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("tasks").select(TASK_SELECT).order("position"),
  ])

  const failed = [workspaces, projects, tags, tasks].find((result) => result.error)
  if (failed?.error) {
    logError("loadAppData", failed.error)
    throw new Error("Could not load your tasks. Please refresh to try again.")
  }

  return {
    workspaces: workspaces.data ?? [],
    projects: projects.data ?? [],
    tags: tags.data ?? [],
    tasks: (tasks.data ?? []).map(({ task_tags, subtasks, status, priority, ...task }) => ({
      ...task,
      status: isStatus(status) ? status : "todo",
      priority: isPriority(priority) ? priority : "medium",
      subtasks: [...subtasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      tags: task_tags.flatMap((link) => (link.tags ? [link.tags] : [])),
    })),
  }
}
