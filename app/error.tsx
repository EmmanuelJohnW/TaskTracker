"use client"

import { AlertTriangleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangleIcon className="size-6 text-destructive" />
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "We couldn't load your tasks."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
