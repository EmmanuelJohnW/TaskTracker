"use server"

import { createTagSchema, toggleTaskTagSchema } from "@/lib/actions/schemas"
import { assertNoError, unwrap, runAction, type ActionContext } from "@/lib/actions/run"
import { tagColor } from "@/lib/tasks/tag-color"

/** Escapes LIKE wildcards so the name matches literally (case-insensitively). */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

async function insertTag(
  supabase: ActionContext["supabase"],
  tag: { id?: string; name: string; color: string }
) {
  return unwrap(
    await supabase
      .from("tags")
      .insert({ ...(tag.id && { id: tag.id }), name: tag.name, color: tag.color })
      .select("*")
      .single(),
    "insert tag"
  )
}

/** Creates a tag (or reuses one with the same name) and optionally attaches it to a task. */
export async function createTag(input: { id?: string; name: string; color?: string; taskId?: string }) {
  return runAction("createTag", createTagSchema, input, async ({ id, name, color, taskId }, { supabase, userId }) => {
    const existing = unwrap(
      await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", escapeLike(name))
        .limit(1)
        .maybeSingle(),
      "find tag"
    )
    const tag = existing ?? (await insertTag(supabase, { id, name, color: color ?? tagColor(name) }))

    if (taskId) {
      assertNoError(
        await supabase
          .from("task_tags")
          .upsert({ task_id: taskId, tag_id: tag.id }, { ignoreDuplicates: true }),
        "attach tag"
      )
    }
    return tag
  })
}

export async function toggleTaskTag(input: { taskId: string; tagId: string; attached: boolean }) {
  return runAction("toggleTaskTag", toggleTaskTagSchema, input, async ({ taskId, tagId, attached }, { supabase }) => {
    const result = attached
      ? await supabase.from("task_tags").upsert({ task_id: taskId, tag_id: tagId }, { ignoreDuplicates: true })
      : await supabase.from("task_tags").delete().eq("task_id", taskId).eq("tag_id", tagId)
    assertNoError(result, "toggle tag")
  })
}
