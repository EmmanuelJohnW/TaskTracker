"use client"

import { useAppData } from "@/components/app/app-data-provider"
import { CalendarCard } from "@/components/settings/calendar-card"
import { PushCard } from "@/components/settings/push-card"
import { RemindersCard } from "@/components/settings/reminders-card"

export function SettingsView({ siteUrl }: { siteUrl: string }) {
  const { notificationSettings } = useAppData()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PushCard />
      {notificationSettings ? (
        <>
          <RemindersCard settings={notificationSettings} />
          <CalendarCard siteUrl={siteUrl} token={notificationSettings.calendar_token} />
        </>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Your notification settings couldn&apos;t be loaded. Refresh the page to try again.
        </p>
      )}
    </div>
  )
}
