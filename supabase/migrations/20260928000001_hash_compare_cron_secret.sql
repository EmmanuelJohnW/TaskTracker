-- Compare the dispatcher secret via SHA-256 digests rather than directly, so
-- the time taken leaks nothing about the secret itself (the HTTP route already
-- uses a constant-time comparison; this closes the anon RPC path too).

create extension if not exists pgcrypto with schema extensions;

create or replace function private.is_valid_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_secret is not null and length(p_secret) >= 32 and exists (
    select 1 from vault.decrypted_secrets
    where name = 'notify_cron_secret'
      and extensions.digest(decrypted_secret, 'sha256') = extensions.digest(p_secret, 'sha256')
  );
$$;

revoke execute on function private.is_valid_cron_secret(text) from public, anon, authenticated;
