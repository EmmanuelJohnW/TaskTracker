import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseEnv } from "@/lib/env"
import type { Database } from "@/lib/supabase/database.types"

const PUBLIC_PATHS = ["/login", "/auth"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

const CALLBACK_PATH = "/auth/callback"

/**
 * Supabase falls back to the Site URL when a redirect isn't allow-listed, so a
 * sign-in code can land on any page. Hand it to the callback instead of dropping it.
 */
function strayAuthCodeRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl
  if (pathname === CALLBACK_PATH) return null
  if (!searchParams.has("code") && !searchParams.has("token_hash")) return null

  const target = request.nextUrl.clone()
  target.pathname = CALLBACK_PATH
  return NextResponse.redirect(target)
}

/** Refreshes the Supabase session cookie and gates private routes. */
export async function updateSession(request: NextRequest) {
  const stray = strayAuthCodeRedirect(request)
  if (stray) return stray

  let response = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        )
      },
    },
  })

  // Do not run code between createServerClient and getClaims(): it refreshes
  // the session and a gap here can log users out at random.
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims)
  const { pathname } = request.nextUrl

  if (!isSignedIn && !isPublicPath(pathname)) {
    return redirectPreservingCookies(request, response, "/login", pathname)
  }
  if (isSignedIn && pathname === "/login") {
    return redirectPreservingCookies(request, response, "/board")
  }
  return response
}

function redirectPreservingCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  next?: string
) {
  const target = request.nextUrl.clone()
  target.pathname = pathname
  target.search = ""
  if (next && next !== "/") target.searchParams.set("next", next)
  const redirect = NextResponse.redirect(target)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
