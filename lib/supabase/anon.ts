import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { getSupabaseEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database.types"

/**
 * A session-less client for routes called by machines (the scheduler, calendar
 * apps). It can only reach the narrow SECURITY DEFINER functions granted to anon.
 */
export function createAnonClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
