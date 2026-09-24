import { describe, expect, test } from "vitest"

import { DEFAULT_REDIRECT, safeRedirectPath } from "@/lib/auth/redirect"

describe("safeRedirectPath", () => {
  test("keeps same-origin paths with query and hash", () => {
    expect(safeRedirectPath("/list?ws=1&q=a#top")).toBe("/list?ws=1&q=a#top")
  })

  test.each([
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/\t/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    null,
    42,
  ])("rejects %s", (value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT)
  })
})
