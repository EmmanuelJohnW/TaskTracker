"use server"

import {
  createProjectSchema,
  createWorkspaceSchema,
  updateProjectSchema,
  updateWorkspaceSchema,
} from "@/lib/actions/schemas"
import { assertNoError, unwrap, runAction } from "@/lib/actions/run"

export async function createWorkspace(input: { name: string; color: string }) {
  return runAction("createWorkspace", createWorkspaceSchema, input, async ({ name, color }, { supabase, userId }) => {
    const last = assertNoError(
      await supabase
        .from("workspaces")
        .select("position")
        .eq("user_id", userId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "read last workspace"
    )
    return unwrap(
      await supabase
        .from("workspaces")
        .insert({ name, color, position: (last?.position ?? -1) + 1 })
        .select("*")
        .single(),
      "insert workspace"
    )
  })
}

export async function updateWorkspace(input: { id: string; patch: { name?: string; color?: string } }) {
  return runAction("updateWorkspace", updateWorkspaceSchema, input, async ({ id, patch }, { supabase }) => {
    unwrap(
      await supabase.from("workspaces").update(patch).eq("id", id).select("id").single(),
      "update workspace"
    )
  })
}

export async function createProject(input: { workspaceId: string; name: string; color: string }) {
  return runAction("createProject", createProjectSchema, input, async ({ workspaceId, name, color }, { supabase }) => {
    return unwrap(
      await supabase
        .from("projects")
        .insert({ workspace_id: workspaceId, name, color })
        .select("*")
        .single(),
      "insert project"
    )
  })
}

export async function updateProject(input: {
  id: string
  patch: { name?: string; color?: string; archived?: boolean }
}) {
  return runAction("updateProject", updateProjectSchema, input, async ({ id, patch }, { supabase }) => {
    unwrap(
      await supabase.from("projects").update(patch).eq("id", id).select("id").single(),
      "update project"
    )
  })
}
