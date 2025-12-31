create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null references public.leads(id) on delete cascade,
  job_type text not null,                 -- NEW_24H | ESTIMATED_24H | PAID_IMMEDIATE | INSTALLED_24H
  status text not null default 'QUEUED',  -- QUEUED | DONE | CANCELED | FAILED

  run_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists uq_automation_jobs_once
on public.automation_jobs (lead_id, job_type)
where status = 'QUEUED';

create index if not exists idx_automation_jobs_run
on public.automation_jobs (status, run_at);

alter table public.automation_jobs enable row level security;
