create table if not exists public.marketing_report_logs (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,                 -- KST 기준 날짜
  channel text not null default 'EMAIL',     -- EMAIL | SLACK | ETC
  to_target text,                            -- 수신자(이메일/채널)
  subject text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'SENT',       -- SENT | FAILED
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_logs_date on public.marketing_report_logs(report_date);
