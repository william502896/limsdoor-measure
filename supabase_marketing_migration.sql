create table if not exists public.marketing_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,

  source_table text not null, -- documents | secret_documents
  source_id uuid not null,    -- 원본 문서 id

  framework text not null,    -- MARKETING | BRAND | TRAFFIC | STORY | STARTUP | ONEPAGE
  prompt text not null,
  result text not null,

  created_at timestamptz default now()
);

alter table public.marketing_runs enable row level security;

drop policy if exists marketing_runs_my_company on public.marketing_runs;
create policy marketing_runs_my_company
on public.marketing_runs
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());
