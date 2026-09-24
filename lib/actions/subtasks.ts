"use server"

import { addSubtaskSchema, deleteSchema, updateSubtaskSchema } from "@/lib/actions/schemas"
import { assertNoError, unwrap, runAction } from "@/lib/actions/run"

export async function addSubtask(input: { id?: string; taskId: string; title: string }) {
  return runAction("addSubtask", addSubtaskSchema, input, async ({ id, taskId, title }, { supabase }) => {
    const last = assertNoError(
      await supabase
        .from("subtasks")
        .select("position")
        .eq("task_id", taskId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "read last subtask"
    )
    const subtask = unwrap(
      await supabase
        .from("subtasks")
        .insert({ ...(id && { id }), task_id: taskId, title, position: (last?.position ?? -1) + 1 })
        .select("*")
        .single(),
      "insert subtask"
    )
    return subtask
  })
}

export async function updateSubtask(input: { id: string; patch: { title?: string; done?: boolean } }) {
  return runAction("updateSubtask", updateSubtaskSchema, input, async ({ id, patch }, { supabase }) => {
    unwrap(
      await supabase.from("subtasks").update(patch).eq("id", id).select("id").single(),
      "update subtask"
    )
  })
}

export async function deleteSubtask(input: { id: string }) {
  return runAction("deleteSubtask", deleteSchema, input, async ({ id }, { supabase }) => {
    assertNoError(await supabase.from("subtasks").delete().eq("id", id), "delete subtask")
  })
}
