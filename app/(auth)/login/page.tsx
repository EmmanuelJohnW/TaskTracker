import type { Metadata } from "next"

import { LoginForm } from "@/components/auth/login-form"
import { safeRedirectPath } from "@/lib/auth/redirect"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams
  const next = safeRedirectPath(params.next)
  const error = typeof params.error === "string" ? params.error : undefined

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Tracker</h1>
          <p className="text-sm text-muted-foreground">Study and work, on one board.</p>
        </div>
        <LoginForm next={next} initialError={error} />
      </div>
    </main>
  )
}
