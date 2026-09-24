"use server"

import {
  createTaskSchema,
  deleteSchema,
  moveTaskSchema,
  rebalanceSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type MoveTaskInput,
  type UpdateTaskInput,
} from "@/lib/actions/schemas"
import { assertNoError, unwrap, runAction } from "@/lib/actions/run"
import { POSITION_STEP, rebalancedPositions } from "@/lib/tasks/position"
import type { TablesUpdate } from "@/lib/supabase/database.types"

export async function createTask(input: CreateTaskInput) {
  return runAction("createTask", createTaskSchema, input, async (data, { supabase, userId }) => {
    // New tasks go to the top of their column.
    const first = assertNoError(
      await supabase
        .from("tasks")
        .select("position")
        .eq("user_id", userId)
        .eq("status", data.status)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle(),
      "read top position"
    )
    const position = first ? first.position - POSITION_STEP : POSITION_STEP

    const task = unwrap(
      await supabase
        .from("tasks")
        .insert({
          ...(data.id && { id: data.id }),
          title: data.title,
          status: data.status,
          priority: data.priority,
          workspace_id: data.workspaceId,
          project_id: data.projectId ?? null,
          description: data.description ?? null,
          due_at: data.dueAt ?? null,
          position,
        })
        .select("id")
        .single(),
      "insert task"
    )

    if (data.tagIds.length > 0) {
      assertNoError(
        await supabase
          .from("task_tags")
          .insert(data.tagIds.map((tagId) => ({ task_id: task.id, tag_id: tagId }))),
        "attach tags"
      )
    }
    return { id: task.id }
  })
}

export async function updateTask(input: UpdateTaskInput) {
  return runAction("updateTask", updateTaskSchema, input, async ({ id, patch }, { supabase }) => {
    const update: TablesUpdate<"tasks"> = {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.dueAt !== undefined && { due_at: patch.dueAt }),
      ...(patch.projectId !== undefined && { project_id: patch.projectId }),
      ...(patch.workspaceId !== undefined && { workspace_id: patch.workspaceId }),
    }
    unwrap(
      await supabase.from("tasks").update(update).eq("id", id).select("id").single(),
      "update task"
    )
  })
}

export async function moveTask(input: MoveTaskInput) {
  return runAction("moveTask", moveTaskSchema, input, async ({ id, status, position }, { supabase }) => {
    unwrap(
      await supabase.from("tasks").update({ status, position }).eq("id", id).select("id").single(),
      "move task"
    )
  })
}

/** Renumbers a column, keeping its order, once fractional positions get too close. */
export async function rebalanceColumn(input: { status: string }) {
  return runAction("rebalanceColumn", rebalanceSchema, input, async ({ status }, { supabase, userId }) => {
    const rows = unwrap(
      await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", userId)
        .eq("status", status)
        .order("position")
        .order("created_at"),
      "read column"
    )
    const positions = rebalancedPositions(rows.length)
    const results = await Promise.all(
      rows.map((row, i) => supabase.from("tasks").update({ position: positions[i] }).eq("id", row.id))
    )
    results.forEach((result) => assertNoError(result, "rebalance column"))
  })
}

export async function deleteTask(input: { id: string }) {
  return runAction("deleteTask", deleteSchema, input, async ({ id }, { supabase }) => {
    assertNoError(await supabase.from("tasks").delete().eq("id", id), "delete task")
  })
}
