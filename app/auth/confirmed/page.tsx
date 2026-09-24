import { CheckCircle2Icon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Email confirmed" }

/** Landing page for the sign-up confirmation link (via /auth/callback). */
export default async function EmailConfirmedPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const email = typeof data?.claims.email === "string" ? data.claims.email : null
  const isSignedIn = Boolean(data?.claims)

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-6 text-center">
        <CheckCircle2Icon className="mx-auto size-10 text-emerald-500" aria-hidden />
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Email confirmed</h1>
          <p className="text-sm text-muted-foreground">
            {isSignedIn
              ? `You're signed in${email ? ` as ${email}` : ""}. Your Study and Work workspaces are ready.`
              : "Your account is active. Sign in to get started."}
          </p>
        </div>
        <Link
          href={isSignedIn ? "/board" : "/login"}
          className={buttonVariants({ className: "w-full" })}
        >
          {isSignedIn ? "Open my board" : "Sign in"}
        </Link>
      </div>
    </main>
  )
}
