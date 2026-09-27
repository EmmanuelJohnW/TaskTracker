# Tracker

A personal task tracker for juggling coursework and work projects: a Kanban board with drag and drop, deadlines, list and calendar views, and workspaces → projects → tasks, with subtasks and tags.

**Stack:** Next.js 16 (App Router, Server Actions, TypeScript) · Supabase (Postgres, Auth, RLS) via `@supabase/ssr` · Tailwind CSS 4 + shadcn/ui (Base UI) · dnd-kit · date-fns · zod.

## Features

- **Auth:** email + password, or a magic link. The proxy (Next 16's name for middleware) protects every route.
- **Board:** Backlog / To Do / In Progress / Review / Done. Drag cards within and between columns. The move shows immediately (optimistic update) and the order is saved with fractional positions. Each column has a quick-add box at the top. Tasks completed more than 7 days ago are hidden behind **Show older**.
- **Cards:** project chip, priority, due badge, subtask progress and tags. Due badges are red when overdue, amber when due today, yellow within 3 days, and grey otherwise.
- **Organisation:** the sidebar lists All, then each workspace (Study and Work are created on your first login). Under each workspace you can create, rename, recolour and archive projects.
- **Filters:** project, priority, tags, due range and text search. They're stored in the URL, so any view can be bookmarked or shared.
- **Editor:** a side sheet with title, markdown description (Write/Preview), workspace, project, status, priority, deadline (date plus optional time), tags (create them inline) and a subtask checklist. Closing the sheet saves pending edits.
- **Views:** Board, List (grouped Overdue / Today / Tomorrow / This Week / Later / No Date, sortable by due date or priority), Calendar (month grid) and Stats.
- **Dashboard strip:** overdue count, due this week, done this week, your current streak, and open tasks split by workspace.
- **Streaks:** consecutive days with at least one completed task, counted in your local timezone. Today doesn't break a streak until it's over. Reopening a task removes its completion.
- **Stats:** current and longest streak, completions this week and all time, on-time rate against deadlines, a 26-week activity heatmap, completions per week, breakdowns by priority, workspace and project, and a table of recent completions. The sidebar and filters scope it, except the due-date filter.
- **Reminders:** push notifications and a calendar feed (see [Notifications](#notifications)).
- **Shortcuts:** `n` new task · `/` focus search · `Esc` close the editor · `Space` to pick up and drop a focused card · `Enter` to open it.
- Dark mode by default with a light-mode toggle. On mobile the board scrolls one column at a time and the sidebar becomes a drawer.

## Local setup

Prerequisites: Node 20.9+ and, for the local database, [Docker](https://docs.docker.com/get-docker/) (the Supabase CLI is installed as a dev dependency).

```bash
npm install
cp .env.example .env.local
```

### Option A: local Supabase (recommended for development)

```bash
npm run db:start      # boots Postgres, Auth, Studio and Inbucket in Docker
```

`db:start` prints an `API URL` and an `anon key`. Put them in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

On first start, the CLI applies the migrations in `supabase/migrations/` and runs `supabase/seed.sql`. The seed creates a demo user, **demo@example.com / password123**, with sample Study and Work tasks. Then:

```bash
npm run dev           # http://localhost:3000
```

Magic-link and confirmation emails for the local stack show up in Inbucket at http://127.0.0.1:54324.

### Option B: a hosted Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Copy **Project URL** and the **anon public** key from *Project Settings → API* into `.env.local`.
3. Run the migration (next section), then `npm run dev`.

## Running the migration

The whole schema is in `supabase/migrations/20260924000000_init.sql`. It contains the tables, indexes, RLS policies, the `updated_at` and `completed_at` triggers, and the trigger that seeds workspaces on sign-up.

- **Local:** `npm run db:reset` drops the database, re-applies all migrations and re-runs the seed.
- **Hosted, with the CLI:**
  ```bash
  npx supabase login
  npx supabase link --project-ref <your-project-ref>
  npx supabase db push
  ```
- **Hosted, without the CLI:** paste the migration file into the dashboard's *SQL Editor* and run it.

**Sample data on a hosted project:** sign up in the app first. Then, in `supabase/seed.sql`, delete the "demo user" block, set `seed_email` to your address, and run the file in the SQL editor. It replaces that user's tasks, projects and tags with the samples.

### Regenerating types

`lib/supabase/database.types.ts` follows the output format of `supabase gen types`. After a schema change, regenerate it:

```bash
npm run db:types          # from the local stack
npm run db:types:remote   # from the linked hosted project
```

## Supabase auth redirect URLs

Magic links and email confirmations come back through `/auth/callback`, which swaps the code for a session cookie. Supabase only redirects to URLs you have allow-listed.

In the dashboard, under *Authentication → URL Configuration*:

| Setting | Value |
| --- | --- |
| **Site URL** | Your production URL, e.g. `https://tracker.vercel.app` |
| **Redirect URLs** | `http://localhost:3000/auth/callback`<br>`https://tracker.vercel.app/auth/callback`<br>`https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deploys, optional) |

The local stack reads the same settings from `supabase/config.toml` (`[auth] site_url` and `additional_redirect_urls`). They're already set for `localhost:3000`.

Email confirmation is on by default for hosted projects. In that case, sign-up says "Check your email" and the confirmation link signs you in. For a single-user tracker you can turn it off under *Authentication → Providers → Email*.

## Deploying to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repo. The framework preset is detected as Next.js.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your hosted project, for Production and Preview. Optionally set `SITE_URL` (e.g. `https://tracker.vercel.app`). Email sign-in links are then built from it instead of the request's `Origin` header.
4. Deploy.
5. Add the deployment URL to Supabase's **Site URL** and **Redirect URLs** (see the table above), then redeploy if you changed any env vars.

## Notifications

Tracker can remind you even when it's closed, in two ways. Both are managed under **Account → Notifications & calendar**.

- **Push notifications:** alerts before timed deadlines (15 minutes to 1 day ahead), a daily summary of what's due or overdue, and an optional evening streak reminder. Times follow your timezone, which syncs from the browser automatically. Turn push on separately on each device. On iPhone and iPad, first add Tracker to your Home Screen (*Share → Add to Home Screen*; needs iOS 16.4 or later), then turn notifications on from the Home Screen app.
- **Calendar feed:** a private `webcal://` link that shows open tasks with deadlines in Apple Calendar or Google Calendar, with the calendar's own alerts. Anyone with the link can read your task titles, so reset it from Settings if it ever leaks.

### How reminders are sent

A Supabase `pg_cron` job calls `POST /api/notifications/dispatch` every 5 minutes, carrying a secret it reads from Supabase Vault at run time. The route asks the database which reminders are due. The database records each one before it's sent, so each reminder goes out at most once. The route then delivers them with Web Push (VAPID). Devices the push service reports as gone are removed automatically. No Supabase `service_role` key is used anywhere: the scheduler and calendar routes can only reach a few narrow database functions, gated by the cron secret or the calendar token.

### One-time setup (per deployment)

```bash
npm run setup:notifications -- https://your-app.vercel.app
```

This generates the VAPID keys (only if none exist yet) and a fresh cron secret. It saves them to Vercel's production environment and Supabase Vault, schedules the `pg_cron` job, and redeploys. Secret values are never printed. Pass `--rotate-vapid` to replace the VAPID keys (every device must then turn notifications on again), or `--no-deploy` to skip the redeploy. It needs `vercel link` and `supabase link` done first.

For local push testing, run `next dev --experimental-https` and put `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from `npx web-push generate-vapid-keys` in `.env.local`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Vitest: domain logic plus a schema/RLS test that runs the real migration and seed in PGlite |
| `npm run db:start` / `db:reset` | Start the local Supabase stack / re-apply migrations and seed |
| `npm run db:types` / `db:types:remote` | Regenerate Supabase types |
| `npm run icons` | Regenerate all raster icons from `app/icon.svg` |
| `npm run setup:notifications -- <url>` | One-time push reminder setup (see Notifications) |

## Project structure

```
app/
  (auth)/login/           sign in, sign up, magic link
  (app)/layout.tsx        loads the signed-in user's data once, then renders the shell
  (app)/board|list|calendar|stats/
  auth/callback/route.ts  completes magic-link and email-confirmation sign-ins
proxy.ts                  session refresh and route protection (Next 16's middleware)
components/
  app/                    shell, sidebar, header, filter bar, data provider
  board/                  columns, cards, drag and drop, quick add
  task/                   editor sheet, fields, subtasks, tags, shared card metadata
  list/ calendar/ dashboard/ stats/
  ui/                     shadcn/ui primitives
lib/
  supabase/{client,server,middleware}.ts, database.types.ts
  actions/                server actions (zod-validated, shared `runAction` pipeline)
  data/app-data.ts        server-side data loading
  tasks/                  pure domain logic: filters, due dates, positions, grouping, stats
supabase/
  migrations/             schema, RLS, triggers
  seed.sql                demo user and sample tasks
tests/                    Vitest suites
```

### Design notes

- **One load, client-side filtering.** The app layout fetches the user's workspaces, projects, tags and tasks (with subtasks and tags) in one parallel round. The views filter against URL params in the browser, so switching filters or views is instant. That suits a personal tracker with hundreds of tasks. Past a few thousand, move filtering into the queries. Also note that Supabase's API caps responses at 1000 rows by default.
- **Optimistic mutations.** Every change goes through `mutate()` (in `components/app/app-data-provider.tsx`). It applies an optimistic update, calls a server action, and shows a toast for the result. The server action runs `revalidatePath`, which brings back fresh data. If the action fails, the optimistic state is dropped. New tasks and subtasks get their UUID in the browser, so a card keeps the same id after it's saved.
- **Fractional ordering.** A card dropped between two others gets the midpoint of their positions. If positions get closer than `1e-6`, the whole column is renumbered on the server.
- **Deadlines.** A deadline with no time is stored as 23:59 local time, and times are shown only when you set one. Date-relative UI (overdue, "Today", calendar days) is rendered only in the browser, so it always uses your timezone.
- **Security.** Every table has RLS. Write policies also check that referenced workspaces, projects, tasks and tags belong to you, so you can't attach your rows to someone else's. `tests/schema.test.ts` covers this.

## Not included

Email and Moodle sync aren't built. The `tasks.source` and `tasks.external_id` columns are reserved for them.
