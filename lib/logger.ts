/** Server-side error logging. Swap for a real sink (Sentry, Axiom…) when needed. */
export function logError(context: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${context}]`, error instanceof Error ? error.message : error, details ?? "")
}
