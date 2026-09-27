"use client"

import { AlarmClockIcon } from "lucide-react"
import { useState } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { SettingsCard } from "@/components/settings/settings-card"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/ui/native-select"
import { updateNotificationSettings } from "@/lib/actions/notifications"
import { DUE_SOON_OPTIONS, type NotificationSettingsPatch } from "@/lib/actions/schemas"
import type { NotificationSettings } from "@/lib/tasks/types"

const LEAD_LABELS: Record<(typeof DUE_SOON_OPTIONS)[number], string> = {
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  120: "2 hours before",
  1440: "1 day before",
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`

type Editable = Pick<
  NotificationSettings,
  | "due_soon_enabled"
  | "due_soon_minutes"
  | "daily_summary_enabled"
  | "daily_summary_hour"
  | "streak_reminder_enabled"
  | "streak_reminder_hour"
>

export function RemindersCard({ settings }: { settings: NotificationSettings }) {
  const { mutate } = useAppData()
  const [values, setValues] = useState<Editable>(settings)

  const save = (patch: NotificationSettingsPatch & Partial<Editable>) => {
    const previous = values
    setValues({ ...values, ...patch })
    void mutate(() => updateNotificationSettings(patch), { success: "Reminder settings saved" }).then((result) => {
      if (!result.success) setValues(previous)
    })
  }

  return (
    <SettingsCard
      title="Reminders"
      description={`What to be notified about. Times use your timezone (${settings.timezone}).`}
      icon={<AlarmClockIcon className="size-4" />}
    >
      <ReminderRow
        id="due-soon"
        label="Before a deadline"
        hint="For deadlines with a time. Date-only deadlines are covered by the daily summary."
        checked={values.due_soon_enabled}
        onCheckedChange={(due_soon_enabled) => save({ due_soon_enabled })}
      >
        <NativeSelect
          aria-label="How long before the deadline"
          value={values.due_soon_minutes}
          disabled={!values.due_soon_enabled}
          onChange={(event) =>
            save({ due_soon_minutes: Number(event.target.value) as (typeof DUE_SOON_OPTIONS)[number] })
          }
          className="w-44"
        >
          {DUE_SOON_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {LEAD_LABELS[minutes]}
            </option>
          ))}
        </NativeSelect>
      </ReminderRow>

      <ReminderRow
        id="daily-summary"
        label="Daily summary"
        hint="What's due today and anything overdue. Skipped when there's nothing."
        checked={values.daily_summary_enabled}
        onCheckedChange={(daily_summary_enabled) => save({ daily_summary_enabled })}
      >
        <HourSelect
          label="Daily summary time"
          value={values.daily_summary_hour}
          disabled={!values.daily_summary_enabled}
          onChange={(daily_summary_hour) => save({ daily_summary_hour })}
        />
      </ReminderRow>

      <ReminderRow
        id="streak"
        label="Streak reminder"
        hint="Only when you have a streak going and haven't finished a task yet that day."
        checked={values.streak_reminder_enabled}
        onCheckedChange={(streak_reminder_enabled) => save({ streak_reminder_enabled })}
      >
        <HourSelect
          label="Streak reminder time"
          value={values.streak_reminder_hour}
          disabled={!values.streak_reminder_enabled}
          onChange={(streak_reminder_hour) => save({ streak_reminder_hour })}
        />
      </ReminderRow>
    </SettingsCard>
  )
}

interface ReminderRowProps {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}

function ReminderRow({ id, label, hint, checked, onCheckedChange, children }: ReminderRowProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <label htmlFor={id} className="flex min-w-0 flex-1 basis-60 cursor-pointer items-start gap-2.5">
        <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </label>
      {children}
    </div>
  )
}

function HourSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled: boolean
  onChange: (hour: number) => void
}) {
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-28"
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {formatHour(hour)}
        </option>
      ))}
    </NativeSelect>
  )
}
