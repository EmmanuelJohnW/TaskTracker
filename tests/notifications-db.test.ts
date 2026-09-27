import type { PGlite } from "@electric-sql/pglite"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"

import { createTestDb, queryAs, scalar } from "./db-harness"

const ALICE = "00000000-0000-4000-8000-00000000000a"
const BOB = "00000000-0000-4000-8000-00000000000b"
const SECRET = "s".repeat(40)
const ENDPOINT = "https://push.example.com/alice-phone"

interface Claimed {
  kind: string
  title: string
  body: string
  url: string
  subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[]
}

let db: PGlite
let aliceWorkspace: string

const claim = () => queryAs<Claimed>(db, "anon", null, "select * from claim_notifications($1)", [SECRET])

async function addTask(fields: Record<string, string>) {
  const columns = ["user_id", "workspace_id", ...Object.keys(fields)]
  const values = [ALICE, aliceWorkspace, ...Object.values(fields)]
  await db.query(
    `insert into tasks (${columns.join(", ")}) values (${values.map((_, i) => `$${i + 1}`).join(", ")})`,
    values
  )
}

beforeAll(async () => {
  db = await createTestDb()
  await db.exec(`
    insert into auth.users (id, email) values ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com');
    insert into vault.decrypted_secrets values ('notify_cron_secret', '${SECRET}');
  `)
  aliceWorkspace = (await scalar(db, `select id from workspaces where user_id = '${ALICE}' limit 1`)) as string
  await queryAs(db, "authenticated", ALICE, "select save_push_subscription($1, 'p256dh-key', 'auth-key', 'test')", [ENDPOINT])
})

beforeEach(async () => {
  await db.exec(`
    delete from tasks; delete from notification_log;
    update notification_settings set timezone = 'UTC', due_soon_enabled = true, due_soon_minutes = 60,
      daily_summary_enabled = false, streak_reminder_enabled = false;
  `)
})

describe("settings and subscriptions", () => {
  test("every user gets default settings with a private calendar token", async () => {
    const rows = await db.query<{ n: number }>("select count(*)::int as n from notification_settings where calendar_token is not null")
    expect(rows.rows[0].n).toBe(2)
  })

  test("unknown timezones are rejected", async () => {
    await expect(
      queryAs(db, "authenticated", ALICE, "update notification_settings set timezone = 'Mars/Olympus'")
    ).rejects.toThrow(/Unknown timezone/)
  })

  test("users only see their own settings and subscriptions, never the send log", async () => {
    expect(await queryAs(db, "authenticated", BOB, "select * from push_subscriptions")).toHaveLength(0)
    expect(await queryAs(db, "authenticated", BOB, "select * from notification_settings")).toHaveLength(1)
    expect(await queryAs(db, "authenticated", ALICE, "select * from notification_log")).toHaveLength(0)
  })

  test("subscribing requires a session and an https endpoint", async () => {
    await expect(
      queryAs(db, "anon", null, "select save_push_subscription('https://x.example', 'a', 'b')")
    ).rejects.toThrow()
    await expect(
      queryAs(db, "authenticated", BOB, "select save_push_subscription('http://insecure.example', 'a', 'b')")
    ).rejects.toThrow(/Invalid push subscription/)
  })
})

describe("claim_notifications", () => {
  test("refuses callers without the cron secret", async () => {
    await expect(queryAs(db, "anon", null, "select * from claim_notifications('wrong')")).rejects.toThrow(/Unauthorized/)
    await expect(queryAs(db, "authenticated", ALICE, "select * from claim_notifications($1)", [SECRET])).rejects.toThrow()
  })

  test("sends a due-soon reminder exactly once, with the user's devices", async () => {
    await addTask({ title: "Submit lab", due_at: new Date(Date.now() + 30 * 60_000).toISOString() })
    const first = await claim()
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ kind: "due_soon", title: "Submit lab" })
    expect(first[0].body).toMatch(/^Due (today|tomorrow) at \d\d:\d\d$/)
    expect(first[0].url).toMatch(/^\/board\?task=/)
    expect(first[0].subscriptions).toEqual([{ endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-key" } }])
    expect(await claim()).toHaveLength(0)
  })

  test("re-notifies when the deadline moves", async () => {
    await addTask({ title: "Moved", due_at: new Date(Date.now() + 20 * 60_000).toISOString() })
    expect(await claim()).toHaveLength(1)
    await db.exec(`update tasks set due_at = due_at + interval '10 minutes'`)
    expect(await claim()).toHaveLength(1)
  })

  test("skips done tasks, far deadlines, date-only deadlines and users without devices", async () => {
    await addTask({ title: "Done", status: "done", due_at: new Date(Date.now() + 10 * 60_000).toISOString() })
    await addTask({ title: "Later", due_at: new Date(Date.now() + 5 * 3_600_000).toISOString() })
    // Date-only deadlines are stored at 23:59 local time (UTC here).
    await db.exec(`insert into tasks (user_id, workspace_id, title, due_at)
      values ('${ALICE}', '${aliceWorkspace}', 'Date only', (now() + interval '30 minutes')::date + time '23:59')`)
    const bobWorkspace = await scalar(db, `select id from workspaces where user_id = '${BOB}' limit 1`)
    await db.exec(`insert into tasks (user_id, workspace_id, title, due_at)
      values ('${BOB}', '${bobWorkspace}', 'No device', now() + interval '10 minutes')`)
    const titles = (await claim()).map((row) => row.title)
    expect(titles).not.toContain("Done")
    expect(titles).not.toContain("Later")
    expect(titles).not.toContain("No device")
    expect(titles).not.toContain("Date only")
  })

  test("sends the daily summary once in the chosen hour when something is due", async () => {
    await db.exec(`update notification_settings set daily_summary_enabled = true, due_soon_enabled = false,
      daily_summary_hour = extract(hour from now() at time zone 'UTC')::int where user_id = '${ALICE}'`)
    expect(await claim()).toHaveLength(0) // nothing due: no summary
    await addTask({ title: "Overdue essay", due_at: new Date(Date.now() - 86_400_000).toISOString() })
    const [summary, ...rest] = await claim()
    expect(rest).toHaveLength(0)
    expect(summary).toMatchObject({ kind: "daily_summary", title: "1 overdue", body: "Overdue essay", url: "/list" })
    expect(await claim()).toHaveLength(0)
  })

  test("nudges a streak that would end today, but not once today counts", async () => {
    await db.exec(`update notification_settings set streak_reminder_enabled = true, due_soon_enabled = false,
      streak_reminder_hour = extract(hour from now() at time zone 'UTC')::int where user_id = '${ALICE}'`)
    await addTask({ title: "Yesterday", status: "done", completed_at: new Date(Date.now() - 86_400_000).toISOString() })
    await addTask({ title: "Day before", status: "done", completed_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    const [nudge] = await claim()
    expect(nudge).toMatchObject({ kind: "streak", title: "Keep your 2-day streak going" })

    await db.exec("delete from notification_log")
    await addTask({ title: "Today", status: "done" })
    expect(await claim()).toHaveLength(0)
  })

  test("prunes expired endpoints with the secret only", async () => {
    await expect(
      queryAs(db, "anon", null, "select remove_push_subscriptions('nope', array[$1])", [ENDPOINT])
    ).rejects.toThrow(/Unauthorized/)
    await queryAs(db, "authenticated", BOB, "select save_push_subscription('https://push.example.com/bob', 'a', 'b')")
    await queryAs(db, "anon", null, "select remove_push_subscriptions($1, array['https://push.example.com/bob'])", [SECRET])
    expect(await scalar(db, "select count(*)::int from push_subscriptions")).toBe(1)
  })
})

describe("calendar_feed", () => {
  test("returns only the token owner's open, dated tasks", async () => {
    await addTask({ title: "Exam", due_at: new Date(Date.now() + 86_400_000).toISOString() })
    await addTask({ title: "No date" })
    await addTask({ title: "Finished", status: "done", due_at: new Date().toISOString() })
    const token = await scalar(db, `select calendar_token from notification_settings where user_id = '${ALICE}'`)

    const rows = await queryAs<{ title: string; timezone: string }>(db, "anon", null, "select * from calendar_feed($1)", [token])
    expect(rows.map((row) => row.title)).toEqual(["Exam"])
    expect(rows[0].timezone).toBe("UTC")

    const other = await queryAs(db, "anon", null, "select * from calendar_feed($1)", ["00000000-0000-4000-8000-000000000000"])
    expect(other).toHaveLength(0)
  })
})
