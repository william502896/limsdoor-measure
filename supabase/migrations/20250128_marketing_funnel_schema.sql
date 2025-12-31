-- 0) extension
create extension if not exists pgcrypto;

-- 1) funnels: 생성된 퍼널(템플릿 인스턴스)
create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,             -- A_LEADMAGNET | B_PRICE_DIAG | C_CLOSE_PAY
  name text not null default '',
  status text not null default 'ACTIVE', -- ACTIVE | PAUSED | ARCHIVED
  created_at timestamptz not null default now()
);

-- 2) funnel_assets: 랜딩/메시지/설정 등 퍼널 산출물
create table if not exists public.funnel_assets (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  asset_type text not null,              -- LANDING | MESSAGE | RULE
  key text not null default '',          -- e.g. landing_path / msg_1
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 3) leads: 고객(가망고객/상담/실측 연결)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid references public.funnels(id) on delete set null,

  name text,
  phone text,
  region text,
  source text,                           -- danggeun / short / blog / referral / manual
  tags text[] not null default '{}',

  status text not null default 'NEW',    -- NEW|CONTACTED|CONSULTING|MEASUREMENT_SCHEDULED|MEASURED|ESTIMATED|PAY_PENDING|PAID|INSTALLED|REVIEW_REQUESTED|CLOSED
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) lead_events: 상태 변화/행동 로그 (자동화의 핵심)
create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null,              -- LANDING_SUBMIT|DIAG_COMPLETE|CONSULT_BOOKED|MEASURE_DONE|ESTIMATE_SENT|PAY_LINK_SENT|PAID|INSTALL_DONE|REVIEW_SENT
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5) lead_links: 기존 기능(실측/견적/결제/시공) 연결용
-- estimate_id는 이미 payments 테이블에서 쓰고 있으니 연결 가능
create table if not exists public.lead_links (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  estimate_id text,                      -- 기존 실측/견적 식별자
  payment_id uuid,                       -- public.payments.id 연결 (있으면)
  install_id text,                       -- 시공 일정/작업 식별자(추후)
  created_at timestamptz not null default now()
);

-- 6) updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

-- 7) RLS (간단 MVP: 관리자만 접근)
alter table public.funnels enable row level security;
alter table public.funnel_assets enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_links enable row level security;

-- Setup policies for authenticated access (adjust as needed for anon access later)
create policy "Allow all access to service role" on public.funnels for all using (true) with check (true);
create policy "Allow all access to service role" on public.funnel_assets for all using (true) with check (true);
create policy "Allow all access to service role" on public.leads for all using (true) with check (true);
create policy "Allow all access to service role" on public.lead_events for all using (true) with check (true);
create policy "Allow all access to service role" on public.lead_links for all using (true) with check (true);
