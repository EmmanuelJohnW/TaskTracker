import { describe, expect, test } from "vitest"

import { applyOptimistic } from "@/lib/tasks/optimistic"
import { makeTask } from "./factories"

const tag = { id: "tag-1", user_id: "u1", name: "exam", color: null }
const subtask = { id: "s1", user_id: "u1", task_id: "t", title: "Q1", done: false, position: 0 }

describe("applyOptimistic", () => {
  test("creates, updates and deletes without mutating the input", () => {
    const a = makeTask()
    const b = makeTask()
    const tasks = [a]
    const created = applyOptimistic(tasks, { type: "create", task: b })
    expect(created).toEqual([a, b])
    expect(tasks).toEqual([a])

    const updated = applyOptimistic(created, {
      type: "update",
      id: b.id,
      patch: { status: "done", position: 5 },
    })
    expect(updated[1]).toMatchObject({ status: "done", position: 5 })
    expect(created[1].status).toBe("todo")

    expect(applyOptimistic(updated, { type: "delete", id: a.id })).toHaveLength(1)
  })

  test("manages subtasks", () => {
    const task = makeTask()
    let tasks = applyOptimistic([task], { type: "subtask-add", taskId: task.id, subtask })
    expect(tasks[0].subtasks).toEqual([subtask])

    tasks = applyOptimistic(tasks, {
      type: "subtask-update",
      taskId: task.id,
      subtaskId: "s1",
      patch: { done: true },
    })
    expect(tasks[0].subtasks[0].done).toBe(true)
    expect(subtask.done).toBe(false)

    tasks = applyOptimistic(tasks, { type: "subtask-delete", taskId: task.id, subtaskId: "s1" })
    expect(tasks[0].subtasks).toEqual([])
  })

  test("toggles tags idempotently", () => {
    const task = makeTask()
    let tasks = applyOptimistic([task], { type: "tag-toggle", taskId: task.id, tag, attached: true })
    tasks = applyOptimistic(tasks, { type: "tag-toggle", taskId: task.id, tag, attached: true })
    expect(tasks[0].tags).toEqual([tag])
    tasks = applyOptimistic(tasks, { type: "tag-toggle", taskId: task.id, tag, attached: false })
    expect(tasks[0].tags).toEqual([])
  })
})
