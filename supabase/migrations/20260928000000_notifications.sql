-- Notifications: web push subscriptions, per-user reminder settings, a send
-- log for de-duplication, and the SECURITY DEFINER entry points used by the
-- scheduled dispatcher and the calendar feed (neither has a user session).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.notification_settings (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  timezone text not null default 'UTC',
  due_soon_enabled boolean not null default true,
  due_soon_minutes int not null default 60
    check (due_soon_minutes in (15, 30, 60, 120, 1440)),
  daily_summary_enabled boolean not null default true,
  daily_summary_hour int not null default 8 check (daily_summary_hour between 0 and 23),
  streak_reminder_enabled boolean not null default false,
  streak_reminder_hour int not null default 20 check (streak_reminder_hour between 0 and 23),
  calendar_token uuid not null unique default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

-- One row per notification ever sent; the key makes each reminder at-most-once.
create table public.notification_log (
  dedupe_key text primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now()
);
create index notification_log_sent_at_idx on public.notification_log (sent_at);
create index notification_log_user_id_idx on public.notification_log (user_id);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- Reject timezones Postgres doesn't know, so the dispatcher can't fail on one.
create or replace function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
exception when others then
  raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
end;
$$;

create trigger notification_settings_validate_timezone
  before insert or update of timezone on public.notification_settings
  for each row execute function private.validate_timezone();

create or replace function private.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function private.handle_new_user_settings();

insert into public.notification_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.push_subscriptions enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security; -- no policies: definer functions only

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "notification_settings_select_own" on public.notification_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notification_settings_insert_own" on public.notification_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notification_settings_update_own" on public.notification_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

------------------------------------------------------------------------------
-- Functions
------------------------------------------------------------------------------

-- The dispatcher proves itself with a secret kept in Supabase Vault.
create or replace function private.is_valid_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_secret is not null and length(p_secret) >= 32 and exists (
    select 1 from vault.decrypted_secrets
    where name = 'notify_cron_secret' and decrypted_secret = p_secret
  );
$$;

-- Registers this browser's push endpoint for the caller. An endpoint belongs
-- to one browser, so re-registering moves it to whoever is now signed in.
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 2048
     or length(coalesce(p_p256dh, '')) not between 1 and 256
     or length(coalesce(p_auth, '')) not between 1 and 256 then
    raise exception 'Invalid push subscription' using errcode = '22023';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end;
$$;

-- Computes due reminders, records them in the log (so concurrent or repeated
-- runs never double-send) and returns what to push, with each user's devices.
create or replace function public.claim_notifications(p_secret text)
returns table (kind text, title text, body text, url text, tag text, subscriptions jsonb)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.is_valid_cron_secret(p_secret) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  delete from public.notification_log where sent_at < now() - interval '30 days';

  return query
  with users as (
    select s.*, (now() at time zone s.timezone) as local_now
    from public.notification_settings s
    where exists (select 1 from public.push_subscriptions p where p.user_id = s.user_id)
  ),
  due_soon as (
    -- Timed deadlines only; date-only ones (stored at 23:59) get the summary.
    select
      u.user_id,
      'due_soon'::text as kind,
      'due:' || t.id || ':' || extract(epoch from t.due_at)::bigint as dedupe_key,
      t.title as title,
      'Due ' ||
        case when (t.due_at at time zone u.timezone)::date = u.local_now::date then 'today' else 'tomorrow' end ||
        ' at ' || to_char(t.due_at at time zone u.timezone, 'HH24:MI') as body,
      '/board?task=' || t.id as url,
      'task-' || t.id as tag
    from users u
    join public.tasks t on t.user_id = u.user_id
    where u.due_soon_enabled
      and t.status <> 'done'
      and t.due_at > now()
      and t.due_at <= now() + make_interval(mins => u.due_soon_minutes)
      and to_char(t.due_at at time zone u.timezone, 'HH24:MI') <> '23:59'
  ),
  summary as (
    select
      u.user_id,
      'daily_summary'::text as kind,
      'summary:' || u.user_id || ':' || u.local_now::date as dedupe_key,
      concat_ws(', ',
        case when agg.due_today > 0 then agg.due_today || ' due today' end,
        case when agg.overdue > 0 then agg.overdue || ' overdue' end) as title,
      agg.top_titles as body,
      '/list' as url,
      'daily-summary' as tag
    from users u
    cross join lateral (
      select
        count(*) filter (where t.due_at < now()) as overdue,
        count(*) filter (where t.due_at >= now()
          and (t.due_at at time zone u.timezone)::date = u.local_now::date) as due_today,
        (select string_agg(x.title, ' · ') from (
          select t2.title from public.tasks t2
          where t2.user_id = u.user_id and t2.status <> 'done' and t2.due_at is not null
            and (t2.due_at at time zone u.timezone)::date <= u.local_now::date
          order by t2.due_at limit 3
        ) x) as top_titles
      from public.tasks t
      where t.user_id = u.user_id and t.status <> 'done' and t.due_at is not null
        and (t.due_at at time zone u.timezone)::date <= u.local_now::date
    ) agg
    where u.daily_summary_enabled
      and extract(hour from u.local_now) = u.daily_summary_hour
      and agg.overdue + agg.due_today > 0
  ),
  streak as (
    select
      u.user_id,
      'streak'::text as kind,
      'streak:' || u.user_id || ':' || u.local_now::date as dedupe_key,
      'Keep your ' || st.len || '-day streak going' as title,
      'Finish a task before midnight to keep it.' as body,
      '/board' as url,
      'streak' as tag
    from users u
    cross join lateral (
      with days as (
        select distinct (t.completed_at at time zone u.timezone)::date as d
        from public.tasks t
        where t.user_id = u.user_id and t.status = 'done' and t.completed_at is not null
      ),
      grouped as (
        select d, d - (row_number() over (order by d))::int as grp from days
      )
      select count(*) as len from grouped
      where grp = (select g.grp from grouped g where g.d = u.local_now::date - 1)
    ) st
    where u.streak_reminder_enabled
      and extract(hour from u.local_now) = u.streak_reminder_hour
      and st.len > 0
      and not exists (
        select 1 from public.tasks t
        where t.user_id = u.user_id and t.status = 'done'
          and (t.completed_at at time zone u.timezone)::date = u.local_now::date
      )
  ),
  candidates as (
    select * from due_soon
    union all select * from summary
    union all select * from streak
  ),
  claimed as (
    insert into public.notification_log (dedupe_key, user_id, kind)
    select c.dedupe_key, c.user_id, c.kind from candidates c
    on conflict (dedupe_key) do nothing
    returning dedupe_key
  )
  select
    c.kind, c.title, c.body, c.url, c.tag,
    (select jsonb_agg(jsonb_build_object(
        'endpoint', p.endpoint,
        'keys', jsonb_build_object('p256dh', p.p256dh, 'auth', p.auth)))
     from public.push_subscriptions p where p.user_id = c.user_id)
  from candidates c
  join claimed k on k.dedupe_key = c.dedupe_key;
end;
$$;

-- Drops endpoints the push service reported as gone (HTTP 404/410).
create or replace function public.remove_push_subscriptions(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_cron_secret(p_secret) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

-- Open tasks with a deadline for the owner of a calendar token (the token is
-- an unguessable capability URL the user can regenerate at any time).
create or replace function public.calendar_feed(p_token uuid)
returns table (
  id uuid,
  title text,
  description text,
  due_at timestamptz,
  priority text,
  updated_at timestamptz,
  project_name text,
  workspace_name text,
  timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.title, t.description, t.due_at, t.priority, t.updated_at,
         p.name, w.name, s.timezone
  from public.notification_settings s
  join public.tasks t on t.user_id = s.user_id
  join public.workspaces w on w.id = t.workspace_id
  left join public.projects p on p.id = t.project_id
  where s.calendar_token = p_token
    and t.status <> 'done'
    and t.due_at is not null
  order by t.due_at
  limit 1000;
$$;

------------------------------------------------------------------------------
-- Grants (Supabase grants EXECUTE on new public functions by default)
------------------------------------------------------------------------------

revoke execute on function private.validate_timezone() from public, anon, authenticated;
revoke execute on function private.handle_new_user_settings() from public, anon, authenticated;
revoke execute on function private.is_valid_cron_secret(text) from public, anon, authenticated;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

revoke execute on function public.claim_notifications(text) from public, authenticated;
grant execute on function public.claim_notifications(text) to anon;

revoke execute on function public.remove_push_subscriptions(text, text[]) from public, authenticated;
grant execute on function public.remove_push_subscriptions(text, text[]) to anon;

revoke execute on function public.calendar_feed(uuid) from public;
grant execute on function public.calendar_feed(uuid) to anon, authenticated;
