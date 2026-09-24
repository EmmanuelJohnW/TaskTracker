import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { safeRedirectPath } from "@/lib/auth/redirect"
import { logError } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

/** Completes magic-link and email-confirmation sign-ins (PKCE code or token hash). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeRedirectPath(searchParams.get("next"))

  const supabase = await createClient()
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type && OTP_TYPES.includes(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing auth code") }

  if (error) {
    logError("auth/callback", error)
    const failure = new URL("/login", origin)
    // Supabase verifies the email before redirecting here, so a failed code
    // exchange (e.g. link opened in another browser) usually still means the
    // account is confirmed; the user just needs to sign in.
    failure.searchParams.set(
      "error",
      "We couldn't sign you in from that link. If you just confirmed your email, sign in with your password; otherwise request a new link."
    )
    return NextResponse.redirect(failure)
  }
  return NextResponse.redirect(new URL(next, origin))
}
