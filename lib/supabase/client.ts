import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database.types"

export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}
