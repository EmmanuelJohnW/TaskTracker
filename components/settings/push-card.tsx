"use client"

import { BellIcon, BellOffIcon, Loader2Icon, SendIcon, ShareIcon, SquarePlusIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { SettingsCard } from "@/components/settings/settings-card"
import { Button } from "@/components/ui/button"
import { usePushNotifications, type PushStatus } from "@/hooks/use-push-notifications"
import { sendTestNotification } from "@/lib/actions/notifications"

const STATUS_TEXT: Record<Exclude<PushStatus, "loading" | "needs-install">, string> = {
  unsupported: "This browser can't receive push notifications. Try Chrome, Edge, Firefox or Safari.",
  unconfigured: "Push isn't set up on the server yet. The site owner needs to run npm run setup:notifications.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings (on iPhone: Settings → Notifications → Tracker), then reload.",
  off: "Off on this device.",
  on: "On for this device.",
}

export function PushCard() {
  const { status, isBusy, enable, disable } = usePushNotifications()
  const [isTesting, setIsTesting] = useState(false)

  const report = (result: { success: boolean; error?: string }, success: string) => {
    if (result.success) toast.success(success)
    else toast.error(result.error ?? "Something went wrong.")
  }

  const test = async () => {
    setIsTesting(true)
    const result = await sendTestNotification()
    setIsTesting(false)
    report(result, "Test notification sent")
  }

  return (
    <SettingsCard
      title="Push notifications"
      description="Reminders on this phone or computer, even when Tracker is closed. Turn it on for each device you use."
      icon={<BellIcon className="size-4" />}
    >
      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Checking this device…
        </p>
      )}

      {status === "needs-install" && <InstallSteps />}

      {status !== "loading" && status !== "needs-install" && (
        <p className="text-sm text-muted-foreground">{STATUS_TEXT[status]}</p>
      )}

      {status === "off" && (
        <Button onClick={async () => report(await enable(), "Notifications turned on")} disabled={isBusy}>
          {isBusy ? <Loader2Icon className="animate-spin" /> : <BellIcon />} Turn on for this device
        </Button>
      )}

      {status === "on" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={test} disabled={isTesting}>
            {isTesting ? <Loader2Icon className="animate-spin" /> : <SendIcon />} Send a test
          </Button>
          <Button variant="ghost" onClick={async () => report(await disable(), "Notifications turned off")} disabled={isBusy}>
            <BellOffIcon /> Turn off
          </Button>
        </div>
      )}
    </SettingsCard>
  )
}

function InstallSteps() {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        On iPhone and iPad, notifications only work once Tracker is on your Home Screen:
      </p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          Tap <ShareIcon className="inline size-4 align-text-bottom" aria-label="Share" /> in Safari&apos;s toolbar.
        </li>
        <li>
          Choose <SquarePlusIcon className="inline size-4 align-text-bottom" aria-hidden /> <strong>Add to Home Screen</strong>, then{" "}
          <strong>Add</strong>.
        </li>
        <li>Open Tracker from your Home Screen and come back to Settings.</li>
      </ol>
    </div>
  )
}
