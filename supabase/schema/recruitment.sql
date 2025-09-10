-- Extensions
create extension if not exists "uuid-ossp";

-- Applications
create table if not exists public.applications (
  id uuid primary key default uuid_generate_v4(),
  applicant_name text not null,
  normalized_name text not null,
  email text not null,
  job_category text not null,
  media_source text,
  application_date date not null,
  status text not null,
  document_submit_date date,
  interview_date date,
  interview_implemented_date date,
  hire_date date,
  acceptance_date date,
  rejection_reason text,
  rejection_detail text,
  form_submission_timestamp timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_job_application_date on public.applications (job_category, application_date);
create index if not exists idx_app_status_updated_at on public.applications (status, updated_at);
create index if not exists idx_app_job_document_submit on public.applications (job_category, document_submit_date);
create index if not exists idx_app_job_interview_date on public.applications (job_category, interview_date);
create index if not exists idx_app_job_interview_impl on public.applications (job_category, interview_implemented_date);
create index if not exists idx_app_job_hire_date on public.applications (job_category, hire_date);
create index if not exists idx_app_job_acceptance_date on public.applications (job_category, acceptance_date);
create unique index if not exists uq_app_identity on public.applications (normalized_name, email, job_category, application_date);

-- Weekly Reports
create table if not exists public.weekly_reports (
  id text primary key,
  report_type text not null,
  year int not null,
  week_number int not null,
  start_date date not null,
  end_date date not null,
  job_category text,
  recruitment_metrics jsonb not null,
  is_manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  generated_at timestamptz not null default now()
);

create index if not exists idx_wr_type_year_week on public.weekly_reports (report_type, year desc, week_number desc);
create index if not exists idx_wr_type_job_year_week on public.weekly_reports (report_type, job_category, year desc, week_number desc);

-- Detail Items
create table if not exists public.recruitment_detail_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  comment text,
  job_category text not null,
  platform text not null,
  "order" int not null,
  source_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists idx_rdi_job_platform_created on public.recruitment_detail_items (job_category, platform, created_at);

-- RLS
alter table public.applications enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.recruitment_detail_items enable row level security;

-- Weekly reports: readable by all
drop policy if exists weekly_reports_read_all on public.weekly_reports;
create policy weekly_reports_read_all
  on public.weekly_reports for select
  to anon, authenticated
  using (true);

-- Detail items: read all, write auth
drop policy if exists rdi_read_all on public.recruitment_detail_items;
create policy rdi_read_all
  on public.recruitment_detail_items for select
  to anon, authenticated
  using (true);

drop policy if exists rdi_insert_auth on public.recruitment_detail_items;
create policy rdi_insert_auth
  on public.recruitment_detail_items for insert
  to authenticated
  with check (true);

drop policy if exists rdi_update_auth on public.recruitment_detail_items;
create policy rdi_update_auth
  on public.recruitment_detail_items for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists rdi_delete_auth on public.recruitment_detail_items;
create policy rdi_delete_auth
  on public.recruitment_detail_items for delete
  to authenticated
  using (true);

-- Applications: server only
revoke all on public.applications from anon, authenticated;


