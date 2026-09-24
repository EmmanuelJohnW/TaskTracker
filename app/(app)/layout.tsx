import { Suspense } from "react"

import { AppDataProvider } from "@/components/app/app-data-provider"
import { AppShell } from "@/components/app/app-shell"
import { AppShellSkeleton } from "@/components/app/app-shell-skeleton"
import { TaskEditorProvider } from "@/components/task/task-editor-provider"
import { loadAppData } from "@/lib/data/app-data"
import { createClient } from "@/lib/supabase/server"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppData>{children}</AppData>
    </Suspense>
  )
}

async function AppData({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [{ data: claims }, data] = await Promise.all([supabase.auth.getClaims(), loadAppData()])
  const email = typeof claims?.claims.email === "string" ? claims.claims.email : null

  return (
    <AppDataProvider data={data}>
      <TaskEditorProvider>
        <AppShell email={email}>{children}</AppShell>
      </TaskEditorProvider>
    </AppDataProvider>
  )
}
