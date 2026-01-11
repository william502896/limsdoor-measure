-- 🔥 ONE-SHOT 상용화 패키지 (SQL 통합 스크립트)
-- Supabase Dashboard > SQL Editor에 복사해서 실행하세요.

-- 1️⃣ 기존 Payments 데이터에 company_id 일괄 채우기 (현재 로그인 관리자 기준)
-- 주의: 이 쿼리를 실행하는 관리자(profile)가 속한 회사로 'company_id가 없는' 모든 결제건이 귀속됩니다.
update public.payments p
set company_id = prof.company_id
from public.profiles prof
where prof.id = auth.uid()
  and p.company_id is null;


-- 2️⃣ Schedules (일정) 테이블 생성 및 RLS 적용
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,

  title text not null,
  date date not null,
  time_slot text, -- 오전/오후
  memo text,

  created_at timestamptz default now()
);

alter table public.schedules enable row level security;

drop policy if exists schedules_my_company on public.schedules;
create policy schedules_my_company
on public.schedules
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());


-- 3️⃣ Estimates (실측/견적) 회사 분리 + RLS
alter table public.estimates
add column if not exists company_id uuid references public.companies(id) on delete set null;

-- 3-2 기존 estimates company_id 일괄 채우기
update public.estimates e
set company_id = prof.company_id
from public.profiles prof
where prof.id = auth.uid()
  and e.company_id is null;

-- 3-3 Estimates RLS
alter table public.estimates enable row level security;

drop policy if exists estimates_my_company on public.estimates;
create policy estimates_my_company
on public.estimates
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());


-- 4️⃣ 시크릿 자료실 (Documents / Secret_Documents) 생성 및 RLS
-- 4-1 Normal Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,

  title text not null,
  file_url text not null,
  file_type text, -- pdf, image, txt
  category text,  -- marketing, guide, manual

  created_at timestamptz default now()
);

-- 4-2 Secret Documents (Tier 1 Only)
create table if not exists public.secret_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,

  title text not null,
  file_url text not null,
  source text, -- 책/문서명
  tags text[],

  created_at timestamptz default now()
);

-- 4-3 Documents RLS
alter table public.documents enable row level security;
alter table public.secret_documents enable row level security;

drop policy if exists documents_my_company on public.documents;
create policy documents_my_company
on public.documents
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

drop policy if exists secret_documents_admin_only on public.secret_documents;
create policy secret_documents_admin_only
on public.secret_documents
for all
using (
  company_id = public.current_company_id()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
)
with check (
  company_id = public.current_company_id()
);


-- ✅ Helper function (If not exists from previous steps)
-- This assumes public.current_company_id() function exists. 
-- Usually defined as:
-- create or replace function public.current_company_id() returns uuid as $$
--   select company_id from public.profiles where id = auth.uid()
-- $$ language sql stable;
-- If you haven't created it yet, uncomment below:

create or replace function public.current_company_id() returns uuid as $$
  select company_id from public.profiles where id = auth.uid()
$$ language sql stable security definer;

