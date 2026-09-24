export const DEFAULT_REDIRECT = "/board"

const PLACEHOLDER_ORIGIN = "http://placeholder.invalid"

/**
 * Returns `value` only if it is a same-origin path; otherwise the default.
 * Resolving against a throwaway origin catches every trick browsers accept
 * ("//evil.com", "/\\evil.com", "/\t/evil.com", …) because each of them
 * changes the resolved origin.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_REDIRECT
  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_REDIRECT
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return DEFAULT_REDIRECT
  }
}
