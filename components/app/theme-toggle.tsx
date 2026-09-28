"use client"

import { CheckIcon, PaletteIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEMES } from "@/lib/theme"

/** Theme picker. The label never depends on the theme, which the server can't know. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Choose theme" />}>
        <PaletteIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          {THEMES.map((option) => (
            <DropdownMenuItem key={option.id} onClick={() => setTheme(option.id)}>
              <span
                aria-hidden
                className="relative size-4 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/15"
                style={{ backgroundColor: option.swatch.surface }}
              >
                <span
                  className="absolute inset-y-0 right-0 w-1/2"
                  style={{ backgroundColor: option.swatch.accent }}
                />
              </span>
              <span className="flex-1">{option.label}</span>
              {theme === option.id && <CheckIcon aria-label="Selected" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
