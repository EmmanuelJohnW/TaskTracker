/**
 * Runs the real migration and seed against PGlite (Postgres in WASM) with a
 * minimal stand-in for Supabase's `auth` schema, then exercises RLS as two users.
 */
import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, test } from "vitest"

import { createTestDb, queryAs, readSql, scalar as scalarIn } from "./db-harness"

const USER_A = "00000000-0000-4000-8000-000000000001" // seed.sql demo user
const USER_B = "00000000-0000-4000-8000-0000000000bb"

let db: PGlite

const asUser = <T,>(userId: string, sql: string) => queryAs<T>(db, "authenticated", userId, sql)
const scalar = (sql: string) => scalarIn(db, sql)

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(readSql("seed.sql"))
  await db.exec(readSql("seed.sql")) // re-running the seed must be safe
  await db.exec(`insert into auth.users (id, email) values ('${USER_B}', 'b@example.com')`)
})

describe("seed and first-login defaults", () => {
  test("seed is idempotent", async () => {
    expect(await scalar(`select count(*)::int from tasks`)).toBe(13)
    expect(await scalar(`select count(*)::int from workspaces where user_id = '${USER_A}'`)).toBe(2)
  })

  test("every new user gets Study and Work workspaces", async () => {
    const rows = await db.query<{ name: string }>(
      `select name from workspaces where user_id = '${USER_B}' order by position`
    )
    expect(rows.rows.map((r) => r.name)).toEqual(["Study", "Work"])
  })
})

describe("row level security", () => {
  test("users only see their own rows", async () => {
    expect(await asUser(USER_A, "select id from tasks")).toHaveLength(13)
    expect(await asUser(USER_B, "select id from tasks")).toHaveLength(0)
    expect(await asUser(USER_B, "select * from task_tags")).toHaveLength(0)
    expect(await asUser(USER_B, "select id from projects")).toHaveLength(0)
  })

  test("users cannot write into another user's parents", async () => {
    const aWorkspace = await scalar(`select id from workspaces where user_id = '${USER_A}' limit 1`)
    const aTask = await scalar(`select id from tasks where user_id = '${USER_A}' limit 1`)
    const aTag = await scalar(`select id from tags where user_id = '${USER_A}' limit 1`)

    await expect(
      asUser(USER_B, `insert into tasks (workspace_id, title) values ('${aWorkspace}', 'x')`)
    ).rejects.toThrow(/row-level security/)
    await expect(
      asUser(USER_B, `insert into subtasks (task_id, title) values ('${aTask}', 'x')`)
    ).rejects.toThrow(/row-level security/)

    const bWorkspace = await scalar(`select id from workspaces where user_id = '${USER_B}' limit 1`)
    const [own] = await asUser<{ id: string; user_id: string }>(
      USER_B,
      `insert into tasks (workspace_id, title) values ('${bWorkspace}', 'mine') returning id, user_id`
    )
    expect(own.user_id).toBe(USER_B)
    await expect(
      asUser(USER_B, `insert into task_tags (task_id, tag_id) values ('${own.id}', '${aTag}')`)
    ).rejects.toThrow(/row-level security/)
  })

  test("users cannot update or delete another user's rows", async () => {
    const aTask = await scalar(`select id from tasks where user_id = '${USER_A}' limit 1`)
    expect(await asUser(USER_B, `update tasks set title = 'x' where id = '${aTask}' returning id`)).toHaveLength(0)
    expect(await asUser(USER_B, `delete from tasks where id = '${aTask}' returning id`)).toHaveLength(0)
  })
})

describe("task triggers", () => {
  test("completed_at follows the done status and updated_at advances", async () => {
    const taskId = await scalar(
      `select id from tasks where user_id = '${USER_A}' and status = 'todo' limit 1`
    )
    type Row = { completed_at: string | null; updated_at: string }
    const before = await scalar(`select updated_at from tasks where id = '${taskId}'`)

    const [done] = await asUser<Row>(USER_A, `update tasks set status = 'done' where id = '${taskId}' returning completed_at, updated_at`)
    expect(done.completed_at).not.toBeNull()
    expect(new Date(done.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(before as string).getTime())

    const [renamed] = await asUser<Row>(USER_A, `update tasks set title = 'renamed' where id = '${taskId}' returning completed_at, updated_at`)
    expect(renamed.completed_at).toEqual(done.completed_at)

    const [reopened] = await asUser<Row>(USER_A, `update tasks set status = 'todo' where id = '${taskId}' returning completed_at, updated_at`)
    expect(reopened.completed_at).toBeNull()
  })

  test("deleting a user cascades to their data", async () => {
    await db.exec(`delete from auth.users where id = '${USER_B}'`)
    expect(await scalar(`select count(*)::int from workspaces where user_id = '${USER_B}'`)).toBe(0)
  })
})
