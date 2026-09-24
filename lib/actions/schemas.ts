import { z } from "zod"

import { PRIORITIES, STATUSES } from "@/lib/tasks/types"

export const MAX_TITLE = 300
export const MAX_DESCRIPTION = 20_000
export const MAX_NAME = 80

export const id = z.uuid({ message: "Invalid id" })
export const status = z.enum(STATUSES)
export const priority = z.enum(PRIORITIES)
export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: "Colour must be a hex value like #6366f1" })

export const title = z
  .string()
  .trim()
  .min(1, { message: "Title is required" })
  .max(MAX_TITLE, { message: `Title must be at most ${MAX_TITLE} characters` })

export const name = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(MAX_NAME, { message: `Name must be at most ${MAX_NAME} characters` })

export const position = z.number().finite()
export const isoDateTime = z.iso.datetime({ offset: true })

export const createTaskSchema = z.object({
  /** Client-generated so optimistic cards keep their identity after the save. */
  id: id.optional(),
  title,
  status: status.default("todo"),
  workspaceId: id,
  projectId: id.nullable().optional(),
  priority: priority.default("medium"),
  description: z.string().max(MAX_DESCRIPTION).nullable().optional(),
  dueAt: isoDateTime.nullable().optional(),
  tagIds: z.array(id).max(50).default([]),
})
export type CreateTaskInput = z.input<typeof createTaskSchema>

export const updateTaskSchema = z.object({
  id,
  patch: z
    .object({
      title,
      description: z.string().max(MAX_DESCRIPTION).nullable(),
      status,
      priority,
      dueAt: isoDateTime.nullable(),
      projectId: id.nullable(),
      workspaceId: id,
    })
    .partial()
    .refine((patch) => Object.keys(patch).length > 0, { message: "Nothing to update" }),
})
export type UpdateTaskInput = z.input<typeof updateTaskSchema>

export const moveTaskSchema = z.object({ id, status, position })
export type MoveTaskInput = z.input<typeof moveTaskSchema>

export const rebalanceSchema = z.object({ status })

export const deleteSchema = z.object({ id })

export const addSubtaskSchema = z.object({ id: id.optional(), taskId: id, title })
export const updateSubtaskSchema = z.object({
  id,
  patch: z.object({ title, done: z.boolean() }).partial(),
})

export const createTagSchema = z.object({
  id: id.optional(),
  taskId: id.optional(),
  name,
  color: hexColor.optional(),
})
export const toggleTaskTagSchema = z.object({ taskId: id, tagId: id, attached: z.boolean() })

export const createWorkspaceSchema = z.object({ name, color: hexColor })
export const updateWorkspaceSchema = z.object({
  id,
  patch: z.object({ name, color: hexColor }).partial(),
})

export const createProjectSchema = z.object({ workspaceId: id, name, color: hexColor })
export const updateProjectSchema = z.object({
  id,
  patch: z.object({ name, color: hexColor, archived: z.boolean() }).partial(),
})
