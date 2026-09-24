import "server-only"

import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { fail, ok, type ActionResult } from "@/lib/actions/result"
import { logError } from "@/lib/logger"
import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export interface ActionContext {
  supabase: SupabaseClient<Database>
  userId: string
}

/** A user-facing failure; its message is safe to show in a toast. */
export class ActionError extends Error {}

/**
 * Shared server action pipeline: validate input with zod, require a signed-in
 * user, run the handler, then refresh the app layout so every view re-renders
 * with fresh data. Unexpected errors are logged and reported generically.
 */
export async function runAction<S extends z.ZodType, T>(
  name: string,
  schema: S,
  input: unknown,
  handler: (data: z.infer<S>, ctx: ActionContext) => Promise<T>
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input")
  }

  try {
    const supabase = await createClient()
    const { data: claims, error: authError } = await supabase.auth.getClaims()
    const userId = claims?.claims.sub
    if (authError || !userId) return fail("Your session has expired. Please sign in again.")

    const result = await handler(parsed.data, { supabase, userId })
    revalidatePath("/", "layout")
    return ok(result)
  } catch (error) {
    if (error instanceof ActionError) return fail(error.message)
    logError(name, error, { input: redactInput(parsed.data) })
    return fail("Something went wrong. Please try again.")
  }
}

/** Keeps ids and enums for debugging; drops free text such as titles and notes. */
function redactInput(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactInput)
  if (input === null || typeof input !== "object") return input
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      ["title", "description", "name"].includes(key) ? "[redacted]" : redactInput(value),
    ])
  )
}

/** Throws when a Supabase call returned an error, so runAction can report it. */
export function assertNoError<T>(
  result: { data: T; error: { message: string; code?: string } | null },
  context: string
): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message} (${result.error.code ?? "no code"})`)
  }
  return result.data
}

/** Returns the data of a typed Postgrest response, throwing on error. */
export function unwrap<T>(result: PostgrestSingleResponse<T>, context: string): T {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message} (${result.error.code ?? "no code"})`)
  }
  return result.data
}
