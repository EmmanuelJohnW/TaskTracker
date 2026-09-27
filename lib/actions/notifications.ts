"use server"

import { z } from "zod"

import { ActionError, assertNoError, runAction, unwrap } from "@/lib/actions/run"
import { endpointSchema, notificationSettingsSchema, type NotificationSettingsPatch } from "@/lib/actions/schemas"
import { isValidTimezone } from "@/lib/calendar/ics"
import { getPushEnv } from "@/lib/env"
import { pushSubscriptionSchema, type PushSubscriptionJson } from "@/lib/notifications/payload"
import { sendPush } from "@/lib/notifications/send"

const saveSubscriptionSchema = z.object({
  subscription: pushSubscriptionSchema,
  userAgent: z.string().max(300).optional(),
})

export async function savePushSubscription(input: { subscription: PushSubscriptionJson; userAgent?: string }) {
  return runAction("savePushSubscription", saveSubscriptionSchema, input, async ({ subscription, userAgent }, { supabase }) => {
    assertNoError(
      await supabase.rpc("save_push_subscription", {
        p_endpoint: subscription.endpoint,
        p_p256dh: subscription.keys.p256dh,
        p_auth: subscription.keys.auth,
        p_user_agent: userAgent,
      }),
      "save push subscription"
    )
  })
}

export async function removePushSubscription(input: { endpoint: string }) {
  return runAction("removePushSubscription", endpointSchema, input, async ({ endpoint }, { supabase }) => {
    assertNoError(await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint), "remove push subscription")
  })
}

export async function updateNotificationSettings(input: NotificationSettingsPatch) {
  return runAction("updateNotificationSettings", notificationSettingsSchema, input, async (patch, { supabase, userId }) => {
    if (patch.timezone !== undefined && !isValidTimezone(patch.timezone)) {
      throw new ActionError("That timezone isn't recognised.")
    }
    unwrap(
      await supabase.from("notification_settings").update(patch).eq("user_id", userId).select("user_id").single(),
      "update notification settings"
    )
  })
}

/** Replaces the calendar link, so any copy of the old one stops working. */
export async function regenerateCalendarToken() {
  return runAction("regenerateCalendarToken", z.undefined(), undefined, async (_input, { supabase, userId }) => {
    const row = unwrap(
      await supabase
        .from("notification_settings")
        .update({ calendar_token: crypto.randomUUID() })
        .eq("user_id", userId)
        .select("calendar_token")
        .single(),
      "regenerate calendar token"
    )
    return { token: row.calendar_token }
  })
}

export async function sendTestNotification() {
  return runAction("sendTestNotification", z.undefined(), undefined, async (_input, { supabase }) => {
    const env = getPushEnv()
    if (!env) throw new ActionError("Push notifications aren't set up on the server yet.")

    const rows = unwrap(await supabase.from("push_subscriptions").select("endpoint, p256dh, auth"), "read subscriptions")
    if (rows.length === 0) throw new ActionError("Turn on notifications on this device first.")

    const result = await sendPush(
      env,
      rows.map((row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } })),
      { title: "Notifications are on", body: "This is how Tracker reminders will look.", url: "/board", tag: "test" }
    )
    if (result.expiredEndpoints.length > 0) {
      assertNoError(
        await supabase.from("push_subscriptions").delete().in("endpoint", result.expiredEndpoints),
        "prune expired subscriptions"
      )
    }
    if (result.sent === 0) throw new ActionError("Couldn't reach any of your devices. Try turning notifications off and on.")
    return { sent: result.sent }
  })
}
