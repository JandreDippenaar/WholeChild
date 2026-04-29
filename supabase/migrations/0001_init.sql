-- WholeChild · initial schema
-- Run this in your Supabase project's SQL editor (or via `supabase db push`)
-- after creating the project.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
-- 1:1 with auth.users; carries role + display name.
create type public.user_role as enum ('admin', 'teacher');
create type public.gender as enum ('female', 'male', 'other');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'teacher',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- learners ----------
create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender public.gender,
  grade text,
  guardian_name text,
  guardian_contact text,
  notes text,
  enrolled_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learners_touch on public.learners;
create trigger learners_touch
  before update on public.learners
  for each row execute function public.touch_updated_at();

-- ---------- learner ↔ teacher assignments ----------
create table if not exists public.learner_teachers (
  learner_id uuid not null references public.learners(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  primary key (learner_id, teacher_id)
);

-- ---------- assessments ----------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  assessment_type text not null default 'baseline',
  assessed_on date not null default current_date,
  assessor_id uuid references public.profiles(id) on delete set null,
  scores jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists assessments_learner_idx on public.assessments(learner_id);
create index if not exists assessments_type_idx on public.assessments(assessment_type);

-- ---------- progress entries ----------
create table if not exists public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  entry_date date not null default current_date,
  author_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('academic','behavior','social','emotional','physical')),
  rating int not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists progress_learner_idx on public.progress_entries(learner_id);

-- ---------- helper: is_admin ----------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.learners enable row level security;
alter table public.learner_teachers enable row level security;
alter table public.assessments enable row level security;
alter table public.progress_entries enable row level security;

-- profiles: any authenticated user can read; only the user themselves or an admin can update.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));

-- learners: read by any authenticated user; mutate by admins; teachers may update learners they teach.
drop policy if exists learners_select on public.learners;
create policy learners_select on public.learners
  for select to authenticated using (true);

drop policy if exists learners_insert_admin on public.learners;
create policy learners_insert_admin on public.learners
  for insert to authenticated with check (public.is_admin(auth.uid()));

drop policy if exists learners_update on public.learners;
create policy learners_update on public.learners
  for update to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.learner_teachers lt
      where lt.learner_id = id and lt.teacher_id = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.learner_teachers lt
      where lt.learner_id = id and lt.teacher_id = auth.uid()
    )
  );

drop policy if exists learners_delete_admin on public.learners;
create policy learners_delete_admin on public.learners
  for delete to authenticated using (public.is_admin(auth.uid()));

-- learner_teachers: read by any authenticated user; mutate by admins only.
drop policy if exists lt_select on public.learner_teachers;
create policy lt_select on public.learner_teachers
  for select to authenticated using (true);

drop policy if exists lt_mutate_admin on public.learner_teachers;
create policy lt_mutate_admin on public.learner_teachers
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- assessments: read all; teachers/admins can insert; only the assessor or admin can update/delete.
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
  for select to authenticated using (true);

drop policy if exists assessments_insert on public.assessments;
create policy assessments_insert on public.assessments
  for insert to authenticated
  with check (assessor_id is null or assessor_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists assessments_update on public.assessments;
create policy assessments_update on public.assessments
  for update to authenticated
  using (assessor_id = auth.uid() or public.is_admin(auth.uid()))
  with check (assessor_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists assessments_delete on public.assessments;
create policy assessments_delete on public.assessments
  for delete to authenticated
  using (assessor_id = auth.uid() or public.is_admin(auth.uid()));

-- progress_entries: same pattern as assessments.
drop policy if exists progress_select on public.progress_entries;
create policy progress_select on public.progress_entries
  for select to authenticated using (true);

drop policy if exists progress_insert on public.progress_entries;
create policy progress_insert on public.progress_entries
  for insert to authenticated
  with check (author_id is null or author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists progress_update on public.progress_entries;
create policy progress_update on public.progress_entries
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin(auth.uid()))
  with check (author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists progress_delete on public.progress_entries;
create policy progress_delete on public.progress_entries
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin(auth.uid()));
