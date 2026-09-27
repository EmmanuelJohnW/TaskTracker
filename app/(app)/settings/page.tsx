import type { Metadata } from "next"
import { headers } from "next/headers"

import { SettingsView } from "@/components/settings/settings-view"

export const metadata: Metadata = { title: "Settings" }

/** The public address to show in the calendar link (only ever shown to its owner). */
async function siteUrl(): Promise<string> {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin
  const headerList = await headers()
  return `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`
}

export default async function SettingsPage() {
  return <SettingsView siteUrl={await siteUrl()} />
}
