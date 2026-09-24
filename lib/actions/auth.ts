"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { safeRedirectPath } from "@/lib/auth/redirect"
import { logError } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

export interface AuthFormState {
  error?: string
  message?: string
}

const MIN_PASSWORD = 8

const emailSchema = z.email({ message: "Enter a valid email address" })
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, { message: `Password must be at least ${MIN_PASSWORD} characters` })
  .max(72, { message: "Password must be at most 72 characters" })

const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema })


/**
 * Where Supabase's email links should land. Prefers the configured SITE_URL;
 * otherwise the Origin header, which browsers always send with server actions
 * and Next.js checks against the host. The Host header is never trusted.
 */
async function callbackUrl(next: string): Promise<string | null> {
  const configured = process.env.SITE_URL
  const origin = configured ? new URL(configured).origin : (await headers()).get("origin")
  if (!origin) return null
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

/** Where the sign-up confirmation link lands once the session is created. */
const CONFIRMED_PATH = "/auth/confirmed"

const MISSING_ORIGIN = "Could not determine the site address. Set SITE_URL and try again."

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  redirect(safeRedirectPath(formData.get("next")))
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const next = safeRedirectPath(formData.get("next"))
  const emailRedirectTo = await callbackUrl(CONFIRMED_PATH)
  if (!emailRedirectTo) return { error: MISSING_ORIGIN }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo },
  })
  if (error) return { error: error.message }

  // With email confirmation disabled Supabase returns a session straight away.
  if (data.session) redirect(next)
  return { message: "Check your email to confirm your account." }
}

export async function sendMagicLink(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const emailRedirectTo = await callbackUrl(safeRedirectPath(formData.get("next")))
  if (!emailRedirectTo) return { error: MISSING_ORIGIN }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo },
  })
  if (error) {
    logError("sendMagicLink", error)
    return { error: error.message }
  }
  return { message: "Magic link sent. Check your inbox." }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) logError("signOut", error)
  redirect("/login")
}
