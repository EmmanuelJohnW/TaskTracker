import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test } from "vitest"

import { THEMES, THEME_IDS, isDarkTheme } from "@/lib/theme"

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8")
const ACCENT_THEMES = THEMES.filter((theme) => theme.id !== "dark" && theme.id !== "light")
const AA_TEXT = 4.5

function block(themeId: string): string {
  const match = css.match(new RegExp(`\\[data-theme="${themeId}"\\]\\s*\\{([^}]*)\\}`))
  if (!match) throw new Error(`No palette for theme "${themeId}"`)
  return match[1]
}

function token(themeId: string, name: string): string {
  const match = block(themeId).match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`Theme "${themeId}" has no hex --${name}`)
  return match[1].toLowerCase()
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe("themes", () => {
  test("ids are unique and dark is the only dark theme", () => {
    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length)
    expect(THEMES.filter((theme) => isDarkTheme(theme.id)).map((theme) => theme.id)).toEqual(["dark"])
  })

  test("the dark palette and dark variant are keyed on data-theme", () => {
    expect(css).toContain('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));')
    expect(block("dark")).toContain("color-scheme: dark")
  })

  test.each(ACCENT_THEMES.map((theme) => [theme.id]))("%s: text on every accent surface meets WCAG AA", (id) => {
    const pairs: [string, string][] = [
      ["primary", "primary-foreground"],
      ["secondary", "secondary-foreground"],
      ["accent", "accent-foreground"],
      ["sidebar-accent", "sidebar-accent-foreground"],
      ["sidebar-primary", "sidebar-primary-foreground"],
    ]
    for (const [surface, text] of pairs) {
      const ratio = contrast(token(id, surface), token(id, text))
      expect(ratio, `${id}: --${text} on --${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  test.each(ACCENT_THEMES.map((theme) => [theme.id, theme.swatch.accent]))(
    "%s: the picker swatch matches the real accent",
    (id, swatch) => {
      expect(token(id, "primary")).toBe(swatch.toLowerCase())
    }
  )
})
