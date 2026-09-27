import webpush from "web-push"
import { describe, expect, test } from "vitest"

import { parseSubscriptions } from "@/lib/notifications/payload"
import { urlBase64ToUint8Array } from "@/lib/notifications/vapid"

describe("urlBase64ToUint8Array", () => {
  test("decodes a real VAPID public key to a 65-byte uncompressed P-256 point", () => {
    const { publicKey } = webpush.generateVAPIDKeys()
    const bytes = urlBase64ToUint8Array(publicKey)
    expect(bytes).toHaveLength(65)
    expect(bytes[0]).toBe(0x04)
  })

  test("handles url-safe characters and missing padding", () => {
    expect([...urlBase64ToUint8Array("-_8")]).toEqual([0xfb, 0xff])
  })
})

describe("parseSubscriptions", () => {
  const valid = { endpoint: "https://push.example.com/a", keys: { p256dh: "p", auth: "a" } }

  test("keeps valid subscriptions and drops malformed ones", () => {
    const parsed = parseSubscriptions([
      valid,
      { endpoint: "http://insecure.example.com", keys: { p256dh: "p", auth: "a" } },
      { endpoint: "https://push.example.com/b" },
      "garbage",
    ])
    expect(parsed).toEqual([valid])
  })

  test("treats a non-array (e.g. null from a user with no devices) as empty", () => {
    expect(parseSubscriptions(null)).toEqual([])
  })
})
