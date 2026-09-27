import "server-only"

import webpush from "web-push"

import type { PushEnv } from "@/lib/env"
import { logError } from "@/lib/logger"
import type { PushPayload, PushSubscriptionJson } from "@/lib/notifications/payload"

/** Push services answer 404/410 once a subscription is gone for good. */
const GONE_STATUSES = new Set([404, 410])
/** Reminders are stale after a day; let push services drop them. */
const TTL_SECONDS = 24 * 60 * 60

export interface SendResult {
  sent: number
  failed: number
  expiredEndpoints: string[]
}

function statusOf(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const status = (error as { statusCode: unknown }).statusCode
    return typeof status === "number" ? status : null
  }
  return null
}

export async function sendPush(
  env: PushEnv,
  subscriptions: readonly PushSubscriptionJson[],
  payload: PushPayload
): Promise<SendResult> {
  const body = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(subscription, body, {
        TTL: TTL_SECONDS,
        urgency: "normal",
        vapidDetails: { subject: env.subject, publicKey: env.publicKey, privateKey: env.privateKey },
      })
    )
  )

  return results.reduce<SendResult>(
    (acc, result, i) => {
      if (result.status === "fulfilled") return { ...acc, sent: acc.sent + 1 }
      const status = statusOf(result.reason)
      if (status !== null && GONE_STATUSES.has(status)) {
        return { ...acc, expiredEndpoints: [...acc.expiredEndpoints, subscriptions[i].endpoint] }
      }
      logError("sendPush", result.reason, { status, host: new URL(subscriptions[i].endpoint).host })
      return { ...acc, failed: acc.failed + 1 }
    },
    { sent: 0, failed: 0, expiredEndpoints: [] }
  )
}
