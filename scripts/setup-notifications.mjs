#!/usr/bin/env node
// One-time setup for push reminders. Generates the secrets and stores them
// straight in Vercel and Supabase Vault; nothing secret is printed or saved
// to disk (except a short-lived 0600 temp file for the SQL).
//
//   npm run setup:notifications -- https://your-app.vercel.app [--rotate-vapid] [--no-deploy]
//
// Requires: `vercel link` and `supabase link` done in this directory.

import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createRequire } from "node:module"

const webpush = createRequire(import.meta.url)("web-push")

const CRON_JOB = "tracker-notify"
const CRON_SCHEDULE = "*/5 * * * *"
const VAULT_SECRET = "notify_cron_secret"

const args = process.argv.slice(2)
const siteArg = args.find((arg) => !arg.startsWith("--"))
const rotateVapid = args.includes("--rotate-vapid")
const deploy = !args.includes("--no-deploy")

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function run(command, commandArgs, { input, quiet = false } = {}) {
  const result = spawnSync(command, commandArgs, {
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "inherit" : "pipe", "pipe", "pipe"],
  })
  if (result.status !== 0) {
    if (!quiet) console.error(result.stdout, result.stderr)
    fail(`${command} ${commandArgs.slice(0, 3).join(" ")} failed`)
  }
  return result.stdout
}

let siteUrl
try {
  siteUrl = new URL(siteArg ?? "")
} catch {
  fail("Pass your production URL, e.g. npm run setup:notifications -- https://your-app.vercel.app")
}
if (siteUrl.protocol !== "https:") fail("The production URL must use https.")
if (!existsSync(".vercel/project.json")) fail("Run `npx vercel link` first.")
if (!existsSync("supabase/.temp/project-ref")) fail("Run `npx supabase link` first.")

const dispatchUrl = new URL("/api/notifications/dispatch", siteUrl.origin).href
console.log(`Setting up push reminders for ${siteUrl.origin}\n`)

// 1. Secrets ----------------------------------------------------------------
const existingEnv = run("npx", ["vercel", "env", "ls", "production"], { quiet: true })
const hasVapid = existingEnv.includes("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && existingEnv.includes("VAPID_PRIVATE_KEY")
const cronSecret = randomBytes(32).toString("base64url")

function setVercelEnv(name, value) {
  run("npx", ["vercel", "env", "add", name, "production", "--force"], { input: value, quiet: true })
  console.log(`  ✓ Vercel env ${name}`)
}

if (hasVapid && !rotateVapid) {
  console.log("• VAPID keys already set in Vercel; keeping them (use --rotate-vapid to replace).")
} else {
  if (hasVapid) console.log("• Rotating VAPID keys: every device will need to turn notifications on again.")
  const vapid = webpush.generateVAPIDKeys()
  setVercelEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid.publicKey)
  setVercelEnv("VAPID_PRIVATE_KEY", vapid.privateKey)
}
setVercelEnv("NOTIFY_CRON_SECRET", cronSecret)

// 2. Vault secret + pg_cron job ------------------------------------------------
const sql = `
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = '${VAULT_SECRET}';
  if secret_id is null then
    perform vault.create_secret('${cronSecret}', '${VAULT_SECRET}', 'Bearer token for the Tracker notification dispatcher');
  else
    perform vault.update_secret(secret_id, '${cronSecret}');
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname = '${CRON_JOB}';

select cron.schedule('${CRON_JOB}', '${CRON_SCHEDULE}', $job$
  select net.http_post(
    url := '${dispatchUrl}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = '${VAULT_SECRET}')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$job$);
`
const dir = mkdtempSync(join(tmpdir(), "tracker-setup-"))
const sqlFile = join(dir, "setup.sql")
try {
  writeFileSync(sqlFile, sql, { mode: 0o600 })
  run("npx", ["supabase", "db", "query", "--linked", "-f", sqlFile], { quiet: true })
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log(`  ✓ Supabase Vault secret ${VAULT_SECRET}`)
console.log(`  ✓ pg_cron job ${CRON_JOB} (${CRON_SCHEDULE}) → ${dispatchUrl}`)

// 3. Deploy so the new environment variables take effect -------------------------
if (deploy) {
  console.log("\nDeploying to production so the new settings take effect…")
  run("npx", ["vercel", "deploy", "--prod", "--yes"], { quiet: true })
  console.log("  ✓ Deployed")
} else {
  console.log("\nSkipped deploy. Redeploy production before reminders will send.")
}

console.log("\nDone. Open Settings → Notifications on each device and turn them on.")
