import type { Metadata } from "next"

import { LogoMark } from "@/components/app/logo"
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
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark className="size-12" />
          <h1 className="text-xl font-semibold tracking-tight">Tracker</h1>
          <p className="text-sm text-muted-foreground">Study and work, on one board.</p>
        </div>
        <LoginForm next={next} initialError={error} />
      </div>
    </main>
  )
}
