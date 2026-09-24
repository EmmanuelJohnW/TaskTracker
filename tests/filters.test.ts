import { describe, expect, test } from "vitest"

import {
  EMPTY_FILTERS,
  applyFilters,
  hasActiveFilters,
  parseFilters,
  writeFilters,
} from "@/lib/tasks/filters"
import { makeTask } from "./factories"

const NOW = new Date(2026, 8, 24, 10, 0)
const WS = "11111111-1111-4111-8111-111111111111"
const PROJECT = "22222222-2222-4222-8222-222222222222"
const TAG = "33333333-3333-4333-8333-333333333333"
const tag = { id: TAG, user_id: "u1", name: "exam", color: null }

describe("parseFilters", () => {
  test("reads every supported param", () => {
    const params = new URLSearchParams(
      `ws=${WS}&project=${PROJECT}&priority=high,urgent&tags=${TAG}&due=week&q=heap`
    )
    expect(parseFilters(params)).toEqual({
      workspaceId: WS,
      projectId: PROJECT,
      priorities: ["high", "urgent"],
      tagIds: [TAG],
      due: "week",
      query: "heap",
    })
  })

  test("drops malformed values", () => {
    const params = new URLSearchParams("ws=nope&priority=high,bogus&tags=x,y&due=someday")
    expect(parseFilters(params)).toEqual({ ...EMPTY_FILTERS, priorities: ["high"] })
  })
})

describe("writeFilters", () => {
  test("sets, replaces and removes params without touching others", () => {
    const current = new URLSearchParams("view=x&priority=low&q=old")
    const next = writeFilters(current, { priorities: ["high", "urgent"], query: "" })
    expect(next.get("priority")).toBe("high,urgent")
    expect(next.has("q")).toBe(false)
    expect(next.get("view")).toBe("x")
    expect(current.get("priority")).toBe("low")
  })

  test("round-trips through parseFilters", () => {
    const filters = { ...EMPTY_FILTERS, workspaceId: WS, due: "today" as const, query: "lab" }
    expect(parseFilters(writeFilters(new URLSearchParams(), filters))).toEqual(filters)
  })
})

describe("applyFilters", () => {
  const study = makeTask({ workspace_id: WS, title: "Heap proofs", priority: "high" })
  const tagged = makeTask({ project_id: PROJECT, tags: [tag], description: "Chapter 12" })
  const overdue = makeTask({ due_at: new Date(2026, 8, 23).toISOString() })
  const today = makeTask({ due_at: new Date(2026, 8, 24, 23, 59).toISOString() })
  const all = [study, tagged, overdue, today]

  test("returns everything with no filters", () => {
    expect(applyFilters(all, EMPTY_FILTERS, NOW)).toHaveLength(4)
  })

  test("filters by workspace, project, priority and tags", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, workspaceId: WS }, NOW)).toEqual([study])
    expect(applyFilters(all, { ...EMPTY_FILTERS, projectId: PROJECT }, NOW)).toEqual([tagged])
    expect(applyFilters(all, { ...EMPTY_FILTERS, priorities: ["high"] }, NOW)).toEqual([study])
    expect(applyFilters(all, { ...EMPTY_FILTERS, tagIds: [TAG] }, NOW)).toEqual([tagged])
  })

  test("filters by due range", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, due: "overdue" }, NOW)).toEqual([overdue])
    expect(applyFilters(all, { ...EMPTY_FILTERS, due: "today" }, NOW)).toEqual([today])
    expect(applyFilters(all, { ...EMPTY_FILTERS, due: "week" }, NOW)).toEqual([overdue, today])
    expect(applyFilters(all, { ...EMPTY_FILTERS, due: "none" }, NOW)).toEqual([study, tagged])
  })

  test("searches title and description case-insensitively", () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, query: "HEAP" }, NOW)).toEqual([study])
    expect(applyFilters(all, { ...EMPTY_FILTERS, query: "chapter" }, NOW)).toEqual([tagged])
  })
})

describe("hasActiveFilters", () => {
  test("ignores the workspace, which is navigation rather than a filter", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, workspaceId: WS })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "x" })).toBe(true)
  })
})
