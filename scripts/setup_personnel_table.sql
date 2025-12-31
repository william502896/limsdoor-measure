-- 5. 인사 (Personnel) Table
-- Integrates Measurers, Installers, and other teams
create table if not exists public."인사" (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public."회사들"(id),
  
  "이름" text not null,        -- name
  "연락처" text,               -- phone
  "직책" text,                 -- job_title (e.g. 팀장, 사원)
  "팀" text check ("팀" in ('마케팅', '영업', '관리', '기획', '시공', '실측', 'AS')), -- team
  "입사일" date,               -- join_date
  "메모" text,                 -- memo
  "상태" text default '재직',   -- status (재직, 휴직, 퇴사)
  
  created_at timestamptz default now()
);

alter table public."인사" enable row level security;
create policy "Allow all access for service role" on public."인사" for all using (true) with check (true);
