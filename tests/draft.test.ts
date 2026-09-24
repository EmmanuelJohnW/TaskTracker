import { describe, expect, test } from "vitest"

import { draftFromTask, draftPatch, withWorkspace } from "@/lib/tasks/draft"
import { makeTask } from "./factories"

const project = (id: string, workspaceId: string) => ({
  id, workspace_id: workspaceId, user_id: "u1", name: id, color: null, archived: false, created_at: null,
})

describe("draftPatch", () => {
  test("is empty for an untouched draft", () => {
    const task = makeTask({ description: "notes", due_at: new Date(2026, 8, 24, 23, 59).toISOString() })
    expect(draftPatch(draftFromTask(task), task)).toEqual({})
  })

  test("contains only changed fields", () => {
    const task = makeTask()
    const draft = { ...draftFromTask(task), title: "  New title ", priority: "urgent" as const, dueDate: "2026-09-30" }
    expect(draftPatch(draft, task)).toEqual({
      title: "New title",
      priority: "urgent",
      dueAt: new Date(2026, 8, 30, 23, 59).toISOString(),
    })
  })

  test("treats a blank description and project as null", () => {
    const task = makeTask({ description: "old", project_id: "p1" })
    const draft = { ...draftFromTask(task), description: "   ", projectId: "" }
    expect(draftPatch(draft, task)).toEqual({ description: null, projectId: null })
  })
})

describe("withWorkspace", () => {
  test("clears a project that belongs to another workspace", () => {
    const draft = { ...draftFromTask(makeTask({ project_id: "p1" })) }
    const projects = [project("p1", "ws-study")]
    expect(withWorkspace(draft, "ws-work", projects).projectId).toBe("")
    expect(withWorkspace(draft, "ws-study", projects).projectId).toBe("p1")
  })
})
