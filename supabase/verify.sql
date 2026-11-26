-- ============================================================
-- GPA Ledger — backend health check
--
-- How to use:
--   SQL Editor -> New query -> paste this whole file -> Run.
--
-- Running the whole file returns ONE table: a PASS / FAIL
-- checklist. If something says FAIL, uncomment the matching
-- detail query further down and run just that one.
-- ============================================================


-- ------------------------------------------------------------
-- DETAIL QUERIES — uncomment one at a time if a check fails
-- ------------------------------------------------------------

-- 1. Are the three tables there, and how many rows in each?
-- select
--   (select count(*) from public.profiles)  as profiles,
--   (select count(*) from public.semesters) as semesters,
--   (select count(*) from public.courses)   as courses;

-- 2. Is Row Level Security switched on for each table?
-- select c.relname as table_name, c.relrowsecurity as rls_enabled
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname in ('profiles', 'semesters', 'courses')
-- order by 1;

-- 3. Exactly which policies exist? (expect 8 rows)
-- select tablename, policyname, cmd, roles::text
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

-- 4. Is the signup trigger installed on auth.users?
-- select tgname, tgenabled
-- from pg_trigger
-- where tgrelid = 'auth.users'::regclass
--   and not tgisinternal;

-- 5. Are there accounts that never got a profile row?
--    (only possible if a user signed up before the schema ran)
-- select u.id, u.email, u.created_at
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;

-- 6. FIX for check 5 — backfill the missing profiles:
-- insert into public.profiles (id, display_name)
-- select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null;

-- 7. Prove the policies actually block other people.
--    Copy a real user id from:  select id, email from auth.users limit 5;
--    Then run these five lines together.
--
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"PASTE-A-USER-UUID-HERE","role":"authenticated"}', true);
--   select count(*) as i_can_see_my_profiles from public.profiles;   -- expect 1
--   select count(*) as i_can_see_my_semesters from public.semesters; -- expect your count
--   select count(*) as i_can_see_other_peoples from public.profiles where id <> 'PASTE-A-USER-UUID-HERE';  -- expect 0
-- rollback;
--
--    If "other_peoples" is greater than 0, someone's profile is public — check
--    select id, handle, is_public from public.profiles;


-- ------------------------------------------------------------
-- THE CHECKLIST — leave this uncommented
-- ------------------------------------------------------------

with checks as (
  select 1 as n, 'three tables exist (profiles, semesters, courses)' as check,
         (select count(*) from information_schema.tables
          where table_schema = 'public'
            and table_name in ('profiles', 'semesters', 'courses')) = 3 as ok

  union all
  select 2, 'row level security on all three tables',
         coalesce((select bool_and(c.relrowsecurity)
                   from pg_class c
                   join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public'
                     and c.relname in ('profiles', 'semesters', 'courses')), false)

  union all
  select 3, 'policies installed (8 expected)',
         (select count(*) from pg_policies where schemaname = 'public') >= 8

  union all
  select 4, 'owner policies exist on semesters and courses',
         (select count(*) from pg_policies
          where schemaname = 'public' and policyname in ('semesters owner', 'courses owner')) = 2

  union all
  select 5, 'public-read policies exist on semesters and courses',
         (select count(*) from pg_policies
          where schemaname = 'public' and policyname in ('semesters read public', 'courses read public')) = 2

  union all
  select 6, 'signup trigger installed on auth.users',
         exists (select 1 from pg_trigger
                 where tgrelid = 'auth.users'::regclass
                   and tgname = 'on_auth_user_created')

  union all
  select 7, 'profile-creating function installed',
         exists (select 1 from pg_proc p
                 join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'handle_new_user')

  union all
  select 8, 'every account has a profile row',
         not exists (select 1 from auth.users u
                     left join public.profiles p on p.id = u.id
                     where p.id is null)

  union all
  select 9, 'no orphaned courses',
         not exists (select 1 from public.courses c
                     left join public.semesters s on s.id = c.semester_id
                     where s.id is null)
)
select
  n                                        as "#",
  check                                    as "check",
  case when ok then 'PASS' else 'FAIL' end as "result"
from checks
order by n;
