import { describe, expect, test } from "vitest"

import { dayKey, monthGridDays, parseMonth, tasksByDay } from "@/lib/tasks/calendar"
import { completedForList, groupForList, parseListSort } from "@/lib/tasks/list"
import { makeTask } from "./factories"

const NOW = new Date(2026, 8, 24, 10, 0)
const due = (day: number, hour = 23, minute = 59) => new Date(2026, 8, day, hour, minute).toISOString()

describe("groupForList", () => {
  const overdue = makeTask({ title: "overdue", due_at: due(20) })
  const todayLow = makeTask({ title: "today low", due_at: due(24), priority: "low" })
  const todayUrgent = makeTask({ title: "today urgent", due_at: due(24), priority: "urgent" })
  const todayEarly = makeTask({ title: "today early", due_at: due(24, 12), priority: "low" })
  const later = makeTask({ title: "later", due_at: due(30) })
  const noDate = makeTask({ title: "none" })
  const done = makeTask({ title: "done", status: "done", due_at: due(24) })
  const all = [later, noDate, todayLow, done, overdue, todayUrgent, todayEarly]

  test("groups open tasks in deadline order and drops empty groups", () => {
    const groups = groupForList(all, "due", NOW)
    expect(groups.map((g) => g.group)).toEqual(["overdue", "today", "later", "no_date"])
  })

  test("sorts by due time, breaking ties by priority", () => {
    const today = groupForList(all, "due", NOW).find((g) => g.group === "today")
    expect(today?.tasks.map((t) => t.title)).toEqual(["today early", "today urgent", "today low"])
  })

  test("sorts by priority first when asked", () => {
    const today = groupForList(all, "priority", NOW).find((g) => g.group === "today")
    expect(today?.tasks.map((t) => t.title)).toEqual(["today urgent", "today early", "today low"])
  })

  test("lists completed tasks newest first", () => {
    const older = makeTask({ status: "done", completed_at: "2026-09-01T00:00:00Z" })
    const newer = makeTask({ status: "done", completed_at: "2026-09-20T00:00:00Z" })
    expect(completedForList([older, newer, noDate])).toEqual([newer, older])
  })

  test("defaults the sort to due", () => {
    expect(parseListSort(null)).toBe("due")
    expect(parseListSort("priority")).toBe("priority")
    expect(parseListSort("bogus")).toBe("due")
  })
})

describe("calendar helpers", () => {
  test("parses the month param and falls back to the current month", () => {
    expect(parseMonth("2026-02", NOW)).toEqual(new Date(2026, 1, 1))
    expect(parseMonth("garbage", NOW)).toEqual(new Date(2026, 8, 1))
  })

  test("builds full Monday-start weeks", () => {
    const days = monthGridDays(new Date(2026, 8, 1))
    expect(days.length % 7).toBe(0)
    expect(days[0].getDay()).toBe(1)
    expect(dayKey(days[0])).toBe("2026-08-31")
    expect(dayKey(days.at(-1)!)).toBe("2026-10-04")
  })

  test("buckets tasks by local due day", () => {
    const a = makeTask({ due_at: due(24, 9) })
    const b = makeTask({ due_at: due(24, 8) })
    const c = makeTask({ due_at: due(25) })
    const byDay = tasksByDay([a, b, c, makeTask()])
    expect(byDay.get("2026-09-24")).toEqual([b, a])
    expect(byDay.get("2026-09-25")).toEqual([c])
    expect(byDay.size).toBe(2)
  })
})
