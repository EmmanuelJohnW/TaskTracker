"use client"

import { useEffect, useRef } from "react"

import { updateNotificationSettings } from "@/lib/actions/notifications"
import { logClientError } from "@/lib/client-log"

/**
 * Reminders are scheduled in the user's local time, so keep the stored
 * timezone in step with the browser (e.g. after travelling). Silent by design.
 */
export function useTimezoneSync(storedTimezone: string | null | undefined) {
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current || !storedTimezone) return
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!browserTimezone || browserTimezone === storedTimezone) return
    attempted.current = true
    updateNotificationSettings({ timezone: browserTimezone })
      .then((result) => {
        if (!result.success) logClientError("timezone sync", result.error)
      })
      .catch((error: unknown) => logClientError("timezone sync", error))
  }, [storedTimezone])
}
