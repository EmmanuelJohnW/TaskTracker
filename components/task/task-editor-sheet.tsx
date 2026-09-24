"use client"

import { useRef } from "react"

import { useAppData } from "@/components/app/app-data-provider"
import { EditTaskForm, NewTaskForm } from "@/components/task/task-form"
import { useTaskEditor } from "@/components/task/task-editor-provider"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function TaskEditorSheet() {
  const { state, close, openTask } = useTaskEditor()
  const { tasks } = useAppData()
  // The open form registers a callback that saves pending edits on close.
  const flushRef = useRef<(() => void) | null>(null)
  const task = state.mode === "edit" ? tasks.find((item) => item.id === state.taskId) : undefined

  const handleOpenChange = (open: boolean) => {
    if (open) return
    flushRef.current?.()
    close()
  }

  return (
    <Sheet open={state.mode !== "closed"} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {state.mode === "new" && (
          <>
            <SheetHeader className="pb-0">
              <SheetTitle>New task</SheetTitle>
              <SheetDescription className="sr-only">Create a task</SheetDescription>
            </SheetHeader>
            <NewTaskForm defaults={state.defaults} onCreated={openTask} onCancel={close} />
          </>
        )}
        {state.mode === "edit" && task && (
          <>
            <SheetHeader className="pb-0">
              <SheetTitle className="sr-only">Edit task</SheetTitle>
              <SheetDescription className="sr-only">Edit “{task.title}”</SheetDescription>
            </SheetHeader>
            <EditTaskForm key={task.id} task={task} flushRef={flushRef} onDeleted={close} />
          </>
        )}
        {state.mode === "edit" && !task && (
          <SheetHeader>
            <SheetTitle>Task not found</SheetTitle>
            <SheetDescription>It may have been deleted.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
