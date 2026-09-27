import { describe, expect, test } from "vitest"

import { buildIcs, escapeText, foldLine, type CalendarFeedTask } from "@/lib/calendar/ics"

const SITE = "https://tracker.example"

function task(overrides: Partial<CalendarFeedTask> = {}): CalendarFeedTask {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Submit lab",
    description: null,
    due_at: "2026-09-30T06:30:00.000Z",
    priority: "high",
    updated_at: "2026-09-28T00:00:00.000Z",
    project_name: "Data Structures",
    workspace_name: "Study",
    timezone: "Asia/Manila",
    ...overrides,
  }
}

const unfold = (ics: string) => ics.replace(/\r\n /g, "")

describe("escapeText", () => {
  test("prefixes each special character with a real backslash", () => {
    expect([...escapeText(";")]).toEqual(["\\", ";"])
    expect([...escapeText(",")]).toEqual(["\\", ","])
    expect([...escapeText("\\")]).toEqual(["\\", "\\"])
  })

  test("escapes RFC 5545 special characters", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne")
  })
})

describe("foldLine", () => {
  test("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short")
  })

  test("folds long lines to 75 octets without splitting characters", () => {
    const line = `SUMMARY:${"日本語".repeat(20)}`
    const folded = foldLine(line)
    const encoder = new TextEncoder()
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.replace(/\r\n /g, "")).toBe(line)
  })
})

describe("buildIcs", () => {
  const now = new Date("2026-09-28T00:00:00Z")

  test("wraps events in a subscribable calendar with CRLF line endings", () => {
    const ics = buildIcs([task()], { siteUrl: SITE, now })
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true)
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
    expect(ics).toContain("X-WR-TIMEZONE:Asia/Manila")
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT15M")
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true)
  })

  test("timed deadlines become short UTC events with a 1-hour alert", () => {
    const ics = unfold(buildIcs([task()], { siteUrl: SITE, now }))
    expect(ics).toContain("DTSTART:20260930T063000Z")
    expect(ics).toContain("DTEND:20260930T064500Z")
    expect(ics).toContain("TRIGGER:-PT1H")
    expect(ics).toContain(`URL:${SITE}/board?task=11111111-1111-4111-8111-111111111111`)
    expect(ics).toContain("UID:11111111-1111-4111-8111-111111111111@tracker")
  })

  test("date-only deadlines (23:59 local) become all-day events in the user's timezone", () => {
    // 23:59 in Manila (UTC+8) is 15:59 UTC the same day.
    const ics = unfold(buildIcs([task({ due_at: "2026-09-30T15:59:00.000Z" })], { siteUrl: SITE, now }))
    expect(ics).toContain("DTSTART;VALUE=DATE:20260930")
    expect(ics).toContain("DTEND;VALUE=DATE:20261001")
    expect(ics).toContain("TRIGGER:PT9H")
  })

  test("escapes user text and includes the project, priority and notes", () => {
    const ics = unfold(buildIcs([task({ title: "Read ch. 1, 2; notes", description: "Line one\nLine two" })], { siteUrl: SITE, now }))
    expect(ics).toContain("SUMMARY:Read ch. 1\\, 2\\; notes")
    expect(ics).toContain("DESCRIPTION:Study · Data Structures · High priority\\n\\nLine one\\nLine two")
  })

  test("falls back to UTC for an invalid timezone", () => {
    const ics = buildIcs([task({ timezone: "Not/AZone" })], { siteUrl: SITE, now })
    expect(ics).toContain("X-WR-TIMEZONE:UTC")
  })

  test("an empty feed is still a valid calendar", () => {
    const ics = buildIcs([], { siteUrl: SITE, now })
    expect(ics).toContain("X-WR-TIMEZONE:UTC")
    expect(ics).not.toContain("BEGIN:VEVENT")
  })
})
