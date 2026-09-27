/**
 * Boots PGlite (Postgres in WASM) with minimal stand-ins for the Supabase
 * schemas the migrations depend on (auth, vault), then applies every migration.
 */
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

export const SUPABASE_DIR = join(__dirname, "..", "supabase")

const SUPABASE_STUBS = `
  create schema auth;
  create schema extensions;
  create schema vault;
  create role authenticated;
  create role anon;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text,
    encrypted_password text, email_confirmed_at timestamptz,
    raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz, confirmation_token text,
    recovery_token text, email_change_token_new text, email_change text
  );
  create table auth.identities (
    id uuid, user_id uuid, provider_id text, identity_data jsonb, provider text,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
  grant usage on schema auth, public to authenticated, anon;
`

export const readSql = (path: string) => readFileSync(join(SUPABASE_DIR, path), "utf8")

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(SUPABASE_STUBS)
  const migrations = readdirSync(join(SUPABASE_DIR, "migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()
  for (const file of migrations) await db.exec(readSql(`migrations/${file}`))
  await db.exec("grant all on all tables in schema public to authenticated;")
  return db
}

/** Runs `sql` with the given role and JWT subject, like PostgREST would. */
export async function queryAs<T>(
  db: PGlite,
  role: "authenticated" | "anon",
  userId: string | null,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec("reset role;")
  }
}

export async function scalar(db: PGlite, sql: string): Promise<unknown> {
  const rows = await db.query<Record<string, unknown>>(sql)
  return Object.values(rows.rows[0])[0]
}
