-- ============================================================
-- GPA Ledger — database schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Student',
  handle       text unique,
  programme    text default 'BTech',
  school       text default '',
  university   text default '',
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.semesters (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  label      text not null,
  year       text default '',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters on delete cascade,
  code        text default '',
  name        text not null,
  credits     numeric(4,1) not null default 0 check (credits >= 0),
  grade       text not null,
  position    int not null default 0
);

create index if not exists semesters_user_idx on public.semesters (user_id);
create index if not exists courses_semester_idx on public.courses (semester_id);
create index if not exists profiles_handle_idx on public.profiles (handle);

-- ---------- row level security ----------
-- Everyone can read a record whose owner has is_public = true.
-- Only the owner can write their own rows.

alter table public.profiles  enable row level security;
alter table public.semesters enable row level security;
alter table public.courses   enable row level security;

drop policy if exists "profiles read own"     on public.profiles;
drop policy if exists "profiles read public"  on public.profiles;
drop policy if exists "profiles insert own"   on public.profiles;
drop policy if exists "profiles update own"   on public.profiles;

create policy "profiles read own"    on public.profiles for select using (auth.uid() = id);
create policy "profiles read public" on public.profiles for select using (is_public = true);
create policy "profiles insert own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "semesters owner"       on public.semesters;
drop policy if exists "semesters read public" on public.semesters;

create policy "semesters owner" on public.semesters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "semesters read public" on public.semesters
  for select using (
    exists (select 1 from public.profiles p where p.id = semesters.user_id and p.is_public)
  );

drop policy if exists "courses owner"       on public.courses;
drop policy if exists "courses read public" on public.courses;

create policy "courses owner" on public.courses
  for all using (
    exists (select 1 from public.semesters s where s.id = courses.semester_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.semesters s where s.id = courses.semester_id and s.user_id = auth.uid())
  );

create policy "courses read public" on public.courses
  for select using (
    exists (
      select 1 from public.semesters s
      join public.profiles p on p.id = s.user_id
      where s.id = courses.semester_id and p.is_public
    )
  );

-- ---------- create a profile automatically on signup ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', ''), '[^a-z0-9_-]', '', 'g')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
