-- Sample data for local development.
--
-- `supabase db reset` runs this after the migrations. It creates a demo user
-- (demo@example.com / password123) and fills the Study and Work workspaces that
-- the on_auth_user_created trigger seeds for every new user.
--
-- To load sample tasks into a hosted project instead: sign up in the app first,
-- delete the "demo user" block below, change `seed_email` to your address and
-- run the file in the Supabase SQL editor.

create extension if not exists pgcrypto with schema extensions;

-- demo user (local only) -----------------------------------------------------
do $$
declare
  demo_id uuid := '00000000-0000-4000-8000-000000000001';
begin
  if not exists (select 1 from auth.users where email = 'demo@example.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
      'demo@example.com', extensions.crypt('password123', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{}',
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), demo_id, demo_id::text,
      jsonb_build_object('sub', demo_id::text, 'email', 'demo@example.com', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;
end $$;

-- sample data -----------------------------------------------------------------
do $$
declare
  seed_email text := 'demo@example.com';
  uid uuid;
  study uuid;
  work uuid;
  p_ds uuid;
  p_calc uuid;
  p_golf uuid;
  p_pf uuid;
  t_exam uuid;
  t_ship uuid;
  tag_exam uuid;
  tag_reading uuid;
  tag_bug uuid;
  tag_client uuid;
begin
  select id into uid from auth.users where email = seed_email;
  if uid is null then
    raise exception 'No auth user with email %', seed_email;
  end if;

  select id into study from public.workspaces where user_id = uid and name = 'Study';
  select id into work from public.workspaces where user_id = uid and name = 'Work';
  if study is null or work is null then
    raise exception 'Default workspaces missing for %', seed_email;
  end if;

  -- Re-running the seed replaces the sample content.
  delete from public.tasks where user_id = uid;
  delete from public.projects where user_id = uid;
  delete from public.tags where user_id = uid;

  insert into public.projects (user_id, workspace_id, name, color)
    values (uid, study, 'Data Structures', '#6366f1') returning id into p_ds;
  insert into public.projects (user_id, workspace_id, name, color)
    values (uid, study, 'Calculus II', '#10b981') returning id into p_calc;
  insert into public.projects (user_id, workspace_id, name, color)
    values (uid, work, 'Golf Asia', '#f59e0b') returning id into p_golf;
  insert into public.projects (user_id, workspace_id, name, color)
    values (uid, work, 'pf-app', '#ec4899') returning id into p_pf;

  insert into public.tags (user_id, name, color) values (uid, 'exam', '#ef4444') returning id into tag_exam;
  insert into public.tags (user_id, name, color) values (uid, 'reading', '#0ea5e9') returning id into tag_reading;
  insert into public.tags (user_id, name, color) values (uid, 'bug', '#f97316') returning id into tag_bug;
  insert into public.tags (user_id, name, color) values (uid, 'client', '#8b5cf6') returning id into tag_client;

  -- Study
  insert into public.tasks (user_id, workspace_id, project_id, title, description, status, priority, due_at, position)
  values
    (uid, study, p_ds, 'Problem set 4: heaps & priority queues',
      E'Questions 1-6 from chapter 6.\n\n- [ ] Build-heap proof\n- [ ] Heapsort trace', 'in_progress', 'high',
      date_trunc('day', now()) + interval '1 day 23 hours 59 minutes', 1000),
    (uid, study, p_ds, 'Read CLRS ch. 12 (binary search trees)', null, 'todo', 'medium',
      date_trunc('day', now()) + interval '3 days 23 hours 59 minutes', 1000),
    (uid, study, p_calc, 'Submit integration worksheet', null, 'todo', 'urgent',
      date_trunc('day', now()) - interval '1 day' + interval '17 hours', 2000),
    (uid, study, p_calc, 'Review series convergence tests', null, 'backlog', 'low',
      null, 1000),
    (uid, study, p_ds, 'Lab 3: AVL tree implementation', 'Unit tests must pass on the grader.', 'review', 'high',
      date_trunc('day', now()) + interval '23 hours 59 minutes', 1000),
    (uid, study, p_calc, 'Quiz 2 corrections', null, 'done', 'medium',
      date_trunc('day', now()) - interval '2 days', 1000);

  select id into t_exam from public.tasks
    where user_id = uid and title = 'Problem set 4: heaps & priority queues';

  insert into public.tasks (user_id, workspace_id, project_id, title, status, priority, due_at, position)
  values (uid, study, p_calc, 'Midterm exam prep', 'todo', 'high',
    date_trunc('day', now()) + interval '9 days 9 hours', 3000);

  -- Work
  insert into public.tasks (user_id, workspace_id, project_id, title, description, status, priority, due_at, position)
  values
    (uid, work, p_golf, 'Draft tournament landing page copy', null, 'in_progress', 'medium',
      date_trunc('day', now()) + interval '2 days 23 hours 59 minutes', 2000),
    (uid, work, p_golf, 'Send sponsor deck to client', null, 'todo', 'high',
      date_trunc('day', now()) + interval '14 hours', 3000),
    (uid, work, p_pf, 'Fix login redirect loop', 'Happens after the session expires on Safari.', 'todo', 'urgent',
      date_trunc('day', now()) - interval '2 days' + interval '12 hours', 4000),
    (uid, work, p_pf, 'Ship v0.3 release', null, 'backlog', 'medium',
      date_trunc('day', now()) + interval '20 days', 2000),
    (uid, work, p_pf, 'Set up error monitoring', null, 'done', 'low', null, 2000);

  -- One older completed task so the Done column's "Show older" toggle has content.
  insert into public.tasks (user_id, workspace_id, project_id, title, status, priority, position, completed_at)
  values (uid, work, p_golf, 'Kickoff call notes', 'done', 'low', 3000, now() - interval '12 days');

  select id into t_ship from public.tasks where user_id = uid and title = 'Ship v0.3 release';

  insert into public.subtasks (user_id, task_id, title, done, position) values
    (uid, t_exam, 'Question 1', true, 0),
    (uid, t_exam, 'Question 2', true, 1),
    (uid, t_exam, 'Question 3', true, 2),
    (uid, t_exam, 'Question 4', false, 3),
    (uid, t_exam, 'Question 5', false, 4),
    (uid, t_ship, 'Changelog', false, 0),
    (uid, t_ship, 'Tag release', false, 1);

  insert into public.task_tags (task_id, tag_id)
  select t.id, tag_exam from public.tasks t where t.user_id = uid and t.title = 'Midterm exam prep'
  union all
  select t.id, tag_reading from public.tasks t where t.user_id = uid and t.title like 'Read CLRS%'
  union all
  select t.id, tag_bug from public.tasks t where t.user_id = uid and t.title = 'Fix login redirect loop'
  union all
  select t.id, tag_client from public.tasks t where t.user_id = uid and t.title in (
    'Send sponsor deck to client', 'Draft tournament landing page copy');
end $$;
