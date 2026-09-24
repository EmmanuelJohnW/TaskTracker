import { describe, expect, test } from "vitest"

import { fromDueInputs, toDueInputs } from "@/lib/tasks/due-input"

describe("due inputs", () => {
  test("date-only deadlines are stored at 23:59 local and read back without a time", () => {
    const iso = fromDueInputs({ date: "2026-09-24", time: "" })
    expect(iso).toBe(new Date(2026, 8, 24, 23, 59).toISOString())
    expect(toDueInputs(iso)).toEqual({ date: "2026-09-24", time: "" })
  })

  test("explicit times round-trip", () => {
    const iso = fromDueInputs({ date: "2026-09-24", time: "09:30" })
    expect(iso).toBe(new Date(2026, 8, 24, 9, 30).toISOString())
    expect(toDueInputs(iso)).toEqual({ date: "2026-09-24", time: "09:30" })
  })

  test("empty or malformed dates clear the deadline", () => {
    expect(fromDueInputs({ date: "", time: "10:00" })).toBeNull()
    expect(fromDueInputs({ date: "not-a-date", time: "" })).toBeNull()
    expect(toDueInputs(null)).toEqual({ date: "", time: "" })
  })
})
