import { describe, expect, test } from "vitest"

import { groupByStatus, isOlderDone, subtaskProgress } from "@/lib/tasks/board"
import { computeStats } from "@/lib/tasks/stats"
import { makeTask, makeWorkspace } from "./factories"

const NOW = new Date(2026, 8, 24, 10, 0)

describe("groupByStatus", () => {
  test("buckets by status and orders by position", () => {
    const a = makeTask({ status: "todo", position: 2 })
    const b = makeTask({ status: "todo", position: 1 })
    const c = makeTask({ status: "done", position: 5 })
    const columns = groupByStatus([a, b, c])
    expect(columns.todo).toEqual([b, a])
    expect(columns.done).toEqual([c])
    expect(columns.backlog).toEqual([])
  })
})

describe("isOlderDone", () => {
  test("only flags done tasks completed over a week ago", () => {
    const old = makeTask({ status: "done", completed_at: new Date(2026, 8, 10).toISOString() })
    const recent = makeTask({ status: "done", completed_at: new Date(2026, 8, 20).toISOString() })
    expect(isOlderDone(old, NOW)).toBe(true)
    expect(isOlderDone(recent, NOW)).toBe(false)
    expect(isOlderDone(makeTask(), NOW)).toBe(false)
  })
})

describe("subtaskProgress", () => {
  test("counts completed subtasks", () => {
    const sub = (done: boolean) => ({
      id: String(Math.random()), user_id: "u1", task_id: "t", title: "s", done, position: 0,
    })
    expect(subtaskProgress(makeTask({ subtasks: [sub(true), sub(false), sub(true)] }))).toEqual({
      done: 2,
      total: 3,
    })
  })
})

describe("computeStats", () => {
  test("counts overdue, due this week, done this week and the workspace split", () => {
    const study = makeWorkspace()
    const work = makeWorkspace({ id: "ws-work", name: "Work" })
    const tasks = [
      makeTask({ due_at: new Date(2026, 8, 23).toISOString() }), // overdue, this week
      makeTask({ due_at: new Date(2026, 8, 26).toISOString(), workspace_id: "ws-work" }),
      makeTask({ status: "done", completed_at: new Date(2026, 8, 22).toISOString() }),
      makeTask({ status: "done", completed_at: new Date(2026, 8, 1).toISOString() }),
    ]
    const stats = computeStats(tasks, [study, work], NOW)
    expect(stats.overdue).toBe(1)
    expect(stats.dueThisWeek).toBe(2)
    expect(stats.doneThisWeek).toBe(1)
    expect(stats.openTotal).toBe(2)
    expect(stats.split.map((s) => s.openCount)).toEqual([1, 1])
  })
})
