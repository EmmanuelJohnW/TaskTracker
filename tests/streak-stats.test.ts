import { describe, expect, test } from "vitest"

import {
  byProject,
  byWorkspace,
  heatLevel,
  heatmapDays,
  summarize,
  weeklyCounts,
} from "@/lib/tasks/completion-stats"
import { computeStreak } from "@/lib/tasks/streak"
import { makeTask, makeWorkspace } from "./factories"

// Thursday 24 Sep 2026, 10:00 local.
const NOW = new Date(2026, 8, 24, 10, 0)
const doneOn = (day: number, extra: Parameters<typeof makeTask>[0] = {}) =>
  makeTask({ status: "done", completed_at: new Date(2026, 8, day, 12).toISOString(), ...extra })

describe("computeStreak", () => {
  test("is zero with no completions", () => {
    expect(computeStreak([makeTask()], NOW)).toEqual({ current: 0, longest: 0, isActiveToday: false, startedOn: null })
  })

  test("counts consecutive days ending today", () => {
    const streak = computeStreak([doneOn(22), doneOn(23), doneOn(24), doneOn(24)], NOW)
    expect(streak).toMatchObject({ current: 3, longest: 3, isActiveToday: true })
    expect(streak.startedOn).toEqual(new Date(2026, 8, 22))
  })

  test("stays alive through today when yesterday had a completion", () => {
    expect(computeStreak([doneOn(21), doneOn(22), doneOn(23)], NOW)).toMatchObject({ current: 3, isActiveToday: false })
  })

  test("breaks after a missed day but remembers the longest run", () => {
    const streak = computeStreak([doneOn(10), doneOn(11), doneOn(12), doneOn(13), doneOn(20)], NOW)
    expect(streak).toMatchObject({ current: 0, longest: 4 })
  })

  test("ignores tasks that are no longer done", () => {
    const reopened = makeTask({ status: "todo", completed_at: new Date(2026, 8, 24).toISOString() })
    expect(computeStreak([reopened], NOW).current).toBe(0)
  })
})

describe("summarize", () => {
  test("counts weeks, on-time rate and median time to complete", () => {
    const completed = [
      doneOn(24, { due_at: new Date(2026, 8, 25).toISOString(), created_at: new Date(2026, 8, 24, 10).toISOString() }),
      doneOn(22, { due_at: new Date(2026, 8, 21).toISOString(), created_at: new Date(2026, 8, 22, 8).toISOString() }),
      doneOn(16), // last week (Mon 14 - Sun 20)
    ]
    const stats = summarize(completed, NOW)
    expect(stats).toMatchObject({ total: 3, thisWeek: 2, lastWeek: 1, withDeadline: 2, onTimeRate: 0.5 })
    expect(stats.medianHoursToComplete).not.toBeNull()
  })

  test("has no on-time rate without deadlines", () => {
    expect(summarize([doneOn(24)], NOW).onTimeRate).toBeNull()
  })
})

describe("time series", () => {
  test("heatmap covers whole Monday-start weeks and flags future days", () => {
    const days = heatmapDays([doneOn(24), doneOn(24)], 2, NOW)
    expect(days).toHaveLength(14)
    expect(days[0].date.getDay()).toBe(1)
    expect(days.find((d) => d.key === "2026-09-24")?.count).toBe(2)
    expect(days.at(-1)?.isFuture).toBe(true)
  })

  test("weekly counts end with the current week", () => {
    const weeks = weeklyCounts([doneOn(24), doneOn(16), doneOn(15)], 3, NOW)
    expect(weeks.map((w) => w.count)).toEqual([0, 2, 1])
  })

  test("heat levels scale to the busiest day", () => {
    expect([0, 1, 2, 3, 8].map((c) => heatLevel(c, 8))).toEqual([0, 1, 1, 2, 4])
  })
})

describe("breakdowns", () => {
  test("drop empty rows and sort by count", () => {
    const study = makeWorkspace()
    const work = makeWorkspace({ id: "ws-work", name: "Work" })
    const empty = makeWorkspace({ id: "ws-x", name: "Empty" })
    const rows = byWorkspace([doneOn(1, { workspace_id: "ws-work" }), doneOn(2, { workspace_id: "ws-work" }), doneOn(3)], [study, work, empty])
    expect(rows.map((r) => [r.label, r.count])).toEqual([["Work", 2], ["Study", 1]])
  })

  test("fold the long tail into Other", () => {
    const projects = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`, user_id: "u1", workspace_id: "ws-study", name: `P${i}`, color: null, archived: false, created_at: null,
    }))
    const completed = projects.map((p, i) => doneOn(1 + i, { project_id: p.id }))
    const rows = byProject(completed, projects)
    expect(rows).toHaveLength(6)
    expect(rows.at(-1)).toMatchObject({ id: "other", count: 4 })
  })
})

describe("streakDayKeys", () => {
  test("lists each day of the current streak", async () => {
    const { streakDayKeys } = await import("@/lib/tasks/streak")
    const streak = computeStreak([doneOn(22), doneOn(23), doneOn(24)], NOW)
    expect([...streakDayKeys(streak)]).toEqual(["2026-09-22", "2026-09-23", "2026-09-24"])
  })
})

describe("monthLabels", () => {
  test("labels weeks where a month starts, never crowding neighbours", async () => {
    const { monthLabels } = await import("@/lib/tasks/completion-stats")
    const labels = monthLabels(heatmapDays([], 26, NOW))
    const labelled = labels.map((label, i) => [label, i] as const).filter(([label]) => label)
    expect(labelled.map(([label]) => label)).toEqual(["Apr", "May", "Jun", "Jul", "Aug", "Sep"])
    labelled.slice(1).forEach(([, i], k) => expect(i - labelled[k][1]).toBeGreaterThanOrEqual(3))
  })
})
