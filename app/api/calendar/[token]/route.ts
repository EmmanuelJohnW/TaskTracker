import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { buildIcs } from "@/lib/calendar/ics"
import { logError } from "@/lib/logger"
import { createAnonClient } from "@/lib/supabase/anon"

const tokenSchema = z.uuid()
const CACHE_SECONDS = 300

/**
 * Subscribable iCalendar feed: /api/calendar/<token>.ics. The token is a
 * private capability URL; unknown tokens get an empty calendar, so the
 * response never reveals whether a token exists.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/calendar/[token]">) {
  const { token: raw } = await params
  const token = tokenSchema.safeParse(raw.replace(/\.ics$/i, ""))
  if (!token.success) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await createAnonClient().rpc("calendar_feed", { p_token: token.data })
  if (error) {
    logError("calendar.feed", error)
    return NextResponse.json({ error: "Calendar unavailable" }, { status: 500 })
  }

  const siteUrl = process.env.SITE_URL ?? request.nextUrl.origin
  const ics = buildIcs(data ?? [], { siteUrl })
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tracker.ics"',
      "Cache-Control": `private, max-age=${CACHE_SECONDS}`,
      "X-Robots-Tag": "noindex",
    },
  })
}
