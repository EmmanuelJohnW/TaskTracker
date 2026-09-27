"use client"

import { useCallback, useEffect, useState } from "react"

import { removePushSubscription, savePushSubscription } from "@/lib/actions/notifications"
import type { ActionResult } from "@/lib/actions/result"
import { logClientError } from "@/lib/client-log"
import type { PushSubscriptionJson } from "@/lib/notifications/payload"
import { urlBase64ToUint8Array } from "@/lib/notifications/vapid"

export type PushStatus =
  | "loading"
  | "unsupported" // browser has no Web Push
  | "needs-install" // iOS: push only works once added to the Home Screen
  | "unconfigured" // server VAPID key missing
  | "denied" // user blocked notifications
  | "off"
  | "on"

const SW_PATH = "/sw.js"
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia("(display-mode: standalone)").matches || legacy === true
}

function supportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

function registerWorker() {
  return navigator.serviceWorker.register(SW_PATH, { scope: "/", updateViaCache: "none" })
}

function saveToServer(subscription: PushSubscription): Promise<ActionResult> {
  return savePushSubscription({
    subscription: subscription.toJSON() as PushSubscriptionJson,
    userAgent: navigator.userAgent.slice(0, 300),
  })
}

async function detectStatus(): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return "needs-install"
  if (!supportsPush()) return "unsupported"
  if (!VAPID_PUBLIC_KEY) return "unconfigured"
  if (Notification.permission === "denied") return "denied"

  const registration = await registerWorker()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return "off"
  // Re-register quietly in case the server pruned or lost this device.
  const result = await saveToServer(subscription)
  if (!result.success) logClientError("push resync", result.error)
  return "on"
}

/** Push subscription state for this browser, plus enable/disable actions. */
export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading")
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    detectStatus()
      .then((next) => {
        if (!cancelled) setStatus(next)
      })
      .catch((error: unknown) => {
        logClientError("push status", error)
        if (!cancelled) setStatus("unsupported")
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Must run straight from a click: iOS only prompts inside a user gesture. */
  const enable = useCallback(async (): Promise<ActionResult> => {
    if (!VAPID_PUBLIC_KEY) return { success: false, error: "Push isn't configured on the server yet." }
    setIsBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off")
        return { success: false, error: "Notifications weren't allowed." }
      }
      const registration = await registerWorker()
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const result = await saveToServer(subscription)
      if (!result.success) {
        await subscription.unsubscribe()
        return result
      }
      setStatus("on")
      return result
    } catch (error) {
      logClientError("push enable", error)
      return { success: false, error: "Couldn't turn on notifications in this browser." }
    } finally {
      setIsBusy(false)
    }
  }, [])

  const disable = useCallback(async (): Promise<ActionResult> => {
    setIsBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH)
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const { endpoint } = subscription
        await subscription.unsubscribe()
        const result = await removePushSubscription({ endpoint })
        if (!result.success) return result
      }
      setStatus("off")
      return { success: true, data: undefined }
    } catch (error) {
      logClientError("push disable", error)
      return { success: false, error: "Couldn't turn off notifications." }
    } finally {
      setIsBusy(false)
    }
  }, [])

  return { status, isBusy, enable, disable }
}
