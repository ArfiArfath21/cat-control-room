create extension if not exists pgcrypto;

create table if not exists public.admissions_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  institute text not null,
  programme text not null default '',
  stage text not null default 'researching',
  deadline date,
  next_action text not null default '',
  official_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admissions_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null,
  category text not null default 'general',
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admissions_stories (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null,
  competency text not null default '',
  situation text not null default '',
  action text not null default '',
  result text not null default '',
  evidence text not null default '',
  confidence smallint not null default 3 check (confidence between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admissions_practice (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  kind text not null default 'PI',
  institute text not null default '',
  prompt text not null,
  scheduled_for date,
  status text not null default 'planned',
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admissions_results (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  exam text not null,
  score numeric,
  overall_percentile numeric,
  varc_percentile numeric,
  dilr_percentile numeric,
  qa_percentile numeric,
  result_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, exam)
);

create index if not exists admissions_applications_owner_stage_idx on public.admissions_applications (owner_id, stage);
create index if not exists admissions_applications_owner_deadline_idx on public.admissions_applications (owner_id, deadline);
create index if not exists admissions_tasks_owner_due_idx on public.admissions_tasks (owner_id, completed, due_date);
create index if not exists admissions_practice_owner_schedule_idx on public.admissions_practice (owner_id, scheduled_for);

alter table public.admissions_applications enable row level security;
alter table public.admissions_tasks enable row level security;
alter table public.admissions_stories enable row level security;
alter table public.admissions_practice enable row level security;
alter table public.admissions_results enable row level security;

revoke all on public.admissions_applications from anon, authenticated;
revoke all on public.admissions_tasks from anon, authenticated;
revoke all on public.admissions_stories from anon, authenticated;
revoke all on public.admissions_practice from anon, authenticated;
revoke all on public.admissions_results from anon, authenticated;
