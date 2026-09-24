-- Personal task tracker: core schema, RLS, triggers and first-login seeding.

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table public.workspaces (        -- top-level context: "Study", "Work"
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  color text not null default '#6366f1',
  position int not null default 0,
  created_at timestamptz default now()
);

create table public.projects (          -- e.g. "Data Structures", "Golf Asia", "pf-app"
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  color text,
  archived boolean default false,
  created_at timestamptz default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  project_id uuid references public.projects on delete set null,
  workspace_id uuid not null references public.workspaces on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('backlog','todo','in_progress','review','done')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  due_at timestamptz,
  position double precision not null default 0,  -- fractional ordering within a column
  completed_at timestamptz,
  source text not null default 'manual',          -- reserved for future email/Moodle sync
  external_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source, external_id)
);

create table public.subtasks (          -- checklist; drives the progress % on each card
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  task_id uuid not null references public.tasks on delete cascade,
  title text not null,
  done boolean default false,
  position int default 0
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  color text,
  unique (user_id, name)
);

create table public.task_tags (
  task_id uuid references public.tasks on delete cascade,
  tag_id uuid references public.tags on delete cascade,
  primary key (task_id, tag_id)
);

------------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------------

create index tasks_user_status_position_idx on public.tasks (user_id, status, position);
create index tasks_user_due_at_idx on public.tasks (user_id, due_at);
-- Foreign-key lookups used by joins and cascades.
create index projects_workspace_id_idx on public.projects (workspace_id);
create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index subtasks_task_id_idx on public.subtasks (task_id);
create index task_tags_tag_id_idx on public.task_tags (tag_id);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Stamp completed_at when a task enters 'done'; clear it when it leaves.
create or replace function public.set_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.set_completed_at();

-- Seed default workspaces for every new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspaces (user_id, name, color, position)
  values
    (new.id, 'Study', '#6366f1', 0),
    (new.id, 'Work', '#f59e0b', 1);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- Row level security
------------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

-- Helpers used by the write policies so a user can only point rows at parents
-- they own. `security invoker` (the default) keeps them subject to RLS too.
create or replace function public.owns_workspace(ws_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = ws_id and w.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_project(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_id is null or exists (
    select 1 from public.projects p
    where p.id = p_id and p.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_task(t_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = t_id and t.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_tag(t_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.tags t
    where t.id = t_id and t.user_id = (select auth.uid())
  );
$$;

-- workspaces
create policy "workspaces_select_own" on public.workspaces
  for select to authenticated using (user_id = (select auth.uid()));
create policy "workspaces_insert_own" on public.workspaces
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "workspaces_update_own" on public.workspaces
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "workspaces_delete_own" on public.workspaces
  for delete to authenticated using (user_id = (select auth.uid()));

-- projects
create policy "projects_select_own" on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_workspace(workspace_id));
create policy "projects_update_own" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_workspace(workspace_id));
create policy "projects_delete_own" on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- tasks
create policy "tasks_select_own" on public.tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_workspace(workspace_id)
    and public.owns_project(project_id)
  );
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_workspace(workspace_id)
    and public.owns_project(project_id)
  );
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- subtasks
create policy "subtasks_select_own" on public.subtasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "subtasks_insert_own" on public.subtasks
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_task(task_id));
create policy "subtasks_update_own" on public.subtasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_task(task_id));
create policy "subtasks_delete_own" on public.subtasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- tags
create policy "tags_select_own" on public.tags
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tags_insert_own" on public.tags
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tags_update_own" on public.tags
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "tags_delete_own" on public.tags
  for delete to authenticated using (user_id = (select auth.uid()));

-- task_tags: ownership is checked through the parent task (and the tag on write).
create policy "task_tags_select_own" on public.task_tags
  for select to authenticated using (public.owns_task(task_id));
create policy "task_tags_insert_own" on public.task_tags
  for insert to authenticated
  with check (public.owns_task(task_id) and public.owns_tag(tag_id));
create policy "task_tags_update_own" on public.task_tags
  for update to authenticated
  using (public.owns_task(task_id))
  with check (public.owns_task(task_id) and public.owns_tag(tag_id));
create policy "task_tags_delete_own" on public.task_tags
  for delete to authenticated using (public.owns_task(task_id));
