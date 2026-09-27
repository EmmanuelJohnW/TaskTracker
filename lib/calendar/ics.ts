import { DATE_ONLY_HOURS, DATE_ONLY_MINUTES } from "@/lib/tasks/due"
import { PRIORITY_LABELS, isPriority } from "@/lib/tasks/types"

/** A row from the `calendar_feed` database function. */
export interface CalendarFeedTask {
  id: string
  title: string
  description: string | null
  due_at: string
  priority: string
  updated_at: string | null
  project_name: string | null
  workspace_name: string
  timezone: string
}

export interface IcsOptions {
  siteUrl: string
  calendarName?: string
  /** Defaults to the first task's timezone, or UTC. */
  timezone?: string
  now?: Date
}

const TIMED_EVENT_MINUTES = 15
const TIMED_ALARM = "-PT1H"
/** All-day events alert at 09:00 on the day (relative to its midnight start). */
const ALL_DAY_ALARM = "PT9H"
const REFRESH_INTERVAL = "PT15M"
const MAX_LINE_OCTETS = 75

/** RFC 5545 TEXT escaping. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
}

/** Folds a content line to 75 octets per RFC 5545, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line

  const parts: string[] = []
  let current = ""
  let currentOctets = 0
  for (const char of line) {
    const octets = encoder.encode(char).length
    // Continuation lines start with a space, which counts toward the limit.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
    if (currentOctets + octets > limit) {
      parts.push(current)
      current = ""
      currentOctets = 0
    }
    current += char
    currentOctets += octets
  }
  parts.push(current)
  return parts.join("\r\n ")
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

interface LocalParts {
  year: string
  month: string
  day: string
  hour: number
  minute: number
}

function localParts(date: Date, timezone: string): LocalParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  )
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

function nextDay({ year, month, day }: LocalParts): string {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1))
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function eventLines(task: CalendarFeedTask, timezone: string, options: Required<Pick<IcsOptions, "siteUrl">>, now: Date): string[] {
  const due = new Date(task.due_at)
  const local = localParts(due, timezone)
  const isDateOnly = local.hour === DATE_ONLY_HOURS && local.minute === DATE_ONLY_MINUTES
  const url = `${options.siteUrl}/board?task=${task.id}`
  const where = task.project_name ? `${task.workspace_name} · ${task.project_name}` : task.workspace_name
  const priority = isPriority(task.priority) ? PRIORITY_LABELS[task.priority] : task.priority
  const description = [
    `${where} · ${priority} priority`,
    task.description?.trim() || null,
    `Open in Tracker: ${url}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  const timing = isDateOnly
    ? [
        `DTSTART;VALUE=DATE:${local.year}${local.month}${local.day}`,
        `DTEND;VALUE=DATE:${nextDay(local)}`,
        "TRANSP:TRANSPARENT",
      ]
    : [
        `DTSTART:${utcStamp(due)}`,
        `DTEND:${utcStamp(new Date(due.getTime() + TIMED_EVENT_MINUTES * 60_000))}`,
      ]

  return [
    "BEGIN:VEVENT",
    `UID:${task.id}@tracker`,
    `DTSTAMP:${utcStamp(task.updated_at ? new Date(task.updated_at) : now)}`,
    ...timing,
    `SUMMARY:${escapeText(task.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `CATEGORIES:${escapeText(task.workspace_name)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(task.title)}`,
    `TRIGGER:${isDateOnly ? ALL_DAY_ALARM : TIMED_ALARM}`,
    "END:VALARM",
    "END:VEVENT",
  ]
}

/** Builds a subscribable iCalendar feed of task deadlines. */
export function buildIcs(tasks: readonly CalendarFeedTask[], options: IcsOptions): string {
  const now = options.now ?? new Date()
  const requested = options.timezone ?? tasks[0]?.timezone ?? "UTC"
  const timezone = isValidTimezone(requested) ? requested : "UTC"

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tracker//Task deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.calendarName ?? "Tracker deadlines")}`,
    `X-WR-TIMEZONE:${timezone}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${REFRESH_INTERVAL}`,
    `X-PUBLISHED-TTL:${REFRESH_INTERVAL}`,
    ...tasks.flatMap((task) => eventLines(task, timezone, options, now)),
    "END:VCALENDAR",
  ]
  return `${lines.map(foldLine).join("\r\n")}\r\n`
}
