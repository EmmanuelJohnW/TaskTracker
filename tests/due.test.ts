import { describe, expect, test } from "vitest"

import { dueGroup, dueTone, hasExplicitTime, isOverdue } from "@/lib/tasks/due"
import { makeTask } from "./factories"

// Wednesday 24 Sep 2026, 10:00 local time.
const NOW = new Date(2026, 8, 24, 10, 0)
const at = (day: number, hour = 23, minute = 59) =>
  new Date(2026, 8, day, hour, minute).toISOString()

describe("dueTone", () => {
  test("is red when past due", () => {
    expect(dueTone(makeTask({ due_at: at(23) }), NOW)).toBe("overdue")
  })

  test("is overdue earlier the same day", () => {
    expect(dueTone(makeTask({ due_at: at(24, 9) }), NOW)).toBe("overdue")
  })

  test("is amber when due later today", () => {
    expect(dueTone(makeTask({ due_at: at(24) }), NOW)).toBe("today")
  })

  test("is yellow within three days", () => {
    expect(dueTone(makeTask({ due_at: at(27) }), NOW)).toBe("soon")
  })

  test("is neutral beyond three days", () => {
    expect(dueTone(makeTask({ due_at: at(28) }), NOW)).toBe("neutral")
  })

  test("is neutral for done tasks and missing dates", () => {
    expect(dueTone(makeTask({ due_at: at(20), status: "done" }), NOW)).toBe("neutral")
    expect(dueTone(makeTask(), NOW)).toBe("neutral")
  })
})

describe("isOverdue", () => {
  test("ignores done tasks", () => {
    expect(isOverdue(makeTask({ due_at: at(1), status: "done" }), NOW)).toBe(false)
  })
})

describe("dueGroup", () => {
  test.each([
    [at(22), "overdue"],
    [at(24), "today"],
    [at(25), "tomorrow"],
    [at(27), "this_week"], // Sunday closes a Monday-start week
    [at(28), "later"],
    [null, "no_date"],
  ])("%s -> %s", (dueAt, group) => {
    expect(dueGroup(makeTask({ due_at: dueAt }), NOW)).toBe(group)
  })
})

describe("hasExplicitTime", () => {
  test("treats 23:59 as a date-only deadline", () => {
    expect(hasExplicitTime(new Date(2026, 8, 24, 23, 59))).toBe(false)
    expect(hasExplicitTime(new Date(2026, 8, 24, 14, 30))).toBe(true)
  })
})
