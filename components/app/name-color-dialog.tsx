"use client"

import { useState } from "react"

import { ColorSwatches, PALETTE } from "@/components/app/color-swatches"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_NAME } from "@/lib/actions/schemas"

interface NameColorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  initialName?: string
  initialColor?: string
  onSubmit: (values: { name: string; color: string }) => Promise<boolean>
}

export function NameColorDialog(props: NameColorDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Keyed so each opening starts from the latest initial values. */}
        {props.open && <NameColorForm key={`${props.initialName}-${props.initialColor}`} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function NameColorForm({
  onOpenChange,
  title,
  submitLabel,
  initialName = "",
  initialColor = PALETTE[0],
  onSubmit,
}: NameColorDialogProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!name.trim()) return
        setPending(true)
        const saved = await onSubmit({ name: name.trim(), color })
        setPending(false)
        if (saved) onOpenChange(false)
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="entity-name">Name</Label>
        <Input
          id="entity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME}
          autoFocus
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Colour</Label>
        <ColorSwatches value={color} onChange={setColor} />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
