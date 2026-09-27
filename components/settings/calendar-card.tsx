"use client"

import { CalendarPlusIcon, CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAppData } from "@/components/app/app-data-provider"
import { SettingsCard } from "@/components/settings/settings-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { regenerateCalendarToken } from "@/lib/actions/notifications"

const COPIED_RESET_MS = 2000

export function CalendarCard({ siteUrl, token }: { siteUrl: string; token: string }) {
  const { mutate } = useAppData()
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const feedUrl = `${siteUrl}/api/calendar/${token}.ics`
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://")
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      toast.success("Calendar link copied")
      setTimeout(() => setCopied(false), COPIED_RESET_MS)
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.")
    }
  }

  const regenerate = () => {
    setConfirming(false)
    void mutate(() => regenerateCalendarToken(), {
      success: "New link created. Re-subscribe with it; the old one no longer works.",
    })
  }

  return (
    <SettingsCard
      title="Calendar feed"
      description="See task deadlines in Apple Calendar or Google Calendar, with your calendar's own alerts."
      icon={<CalendarPlusIcon className="size-4" />}
    >
      <div className="flex gap-2">
        <input
          readOnly
          value={feedUrl}
          aria-label="Private calendar link"
          onFocus={(event) => event.currentTarget.select()}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 font-mono text-xs text-muted-foreground outline-none focus-visible:border-ring dark:bg-input/30"
        />
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={webcalUrl} className={buttonVariants({ size: "sm" })}>
          Add to Apple Calendar
        </a>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Add to Google Calendar
        </a>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        <li>Open tasks with a deadline appear as events; date-only deadlines are all-day events.</li>
        <li>Calendars refresh subscriptions on their own schedule: minutes on Apple, up to a few hours on Google.</li>
        <li>Anyone with this link can see your task titles and deadlines. Keep it private.</li>
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {confirming ? (
          <>
            <span className="text-xs text-muted-foreground">Old link stops working immediately.</span>
            <Button variant="destructive" size="sm" onClick={regenerate}>
              Create new link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <RefreshCwIcon /> Reset link
          </Button>
        )}
      </div>
    </SettingsCard>
  )
}
