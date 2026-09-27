import { timingSafeEqual } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { getPushEnv } from "@/lib/env"
import { logError } from "@/lib/logger"
import { parseSubscriptions } from "@/lib/notifications/payload"
import { sendPush } from "@/lib/notifications/send"
import { createAnonClient } from "@/lib/supabase/anon"

function bearerMatches(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(header ?? "")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/**
 * Called every few minutes by a Supabase pg_cron job. Claims due reminders
 * (the database de-duplicates them) and delivers them as web push.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFY_CRON_SECRET
  const push = getPushEnv()
  if (!secret || !push) {
    return NextResponse.json({ error: "Notifications are not configured" }, { status: 503 })
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAnonClient()
  const { data: claimed, error } = await supabase.rpc("claim_notifications", { p_secret: secret })
  if (error) {
    logError("dispatch.claim", error)
    return NextResponse.json({ error: "Could not load reminders" }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const expired: string[] = []
  for (const notification of claimed ?? []) {
    const result = await sendPush(push, parseSubscriptions(notification.subscriptions), {
      title: notification.title,
      body: notification.body ?? "",
      url: notification.url,
      tag: notification.tag,
    })
    sent += result.sent
    failed += result.failed
    expired.push(...result.expiredEndpoints)
  }

  if (expired.length > 0) {
    const { error: removeError } = await supabase.rpc("remove_push_subscriptions", {
      p_secret: secret,
      p_endpoints: expired,
    })
    if (removeError) logError("dispatch.remove", removeError)
  }

  return NextResponse.json({ claimed: claimed?.length ?? 0, sent, failed, removed: expired.length })
}
