/** Client-side diagnostics for failures that shouldn't interrupt the user. */
export function logClientError(context: string, error: unknown) {
  console.warn(`[${context}]`, error instanceof Error ? error.message : error)
}
