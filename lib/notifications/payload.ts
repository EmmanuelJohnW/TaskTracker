import { z } from "zod"

/** What the service worker receives and turns into a notification. */
export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(256),
  }),
})
export type PushSubscriptionJson = z.infer<typeof pushSubscriptionSchema>

/** Parses the jsonb array returned by `claim_notifications`, dropping bad rows. */
export function parseSubscriptions(value: unknown): PushSubscriptionJson[] {
  const parsed = z.array(z.unknown()).safeParse(value)
  if (!parsed.success) return []
  return parsed.data.flatMap((item) => {
    const subscription = pushSubscriptionSchema.safeParse(item)
    return subscription.success ? [subscription.data] : []
  })
}
