-- 1. 회사들 (Companies) Table
create table if not exists public."회사들" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  
  "비즈니스 번호" text unique, -- business_number
  "회사명" text not null,       -- company_name
  "주소" text,                 -- address
  "이메일" text,               -- email
  "팩스" text,                 -- fax
  "카톡" text,                 -- kakao
  "로고_url" text,             -- logo_url
  "홈페이지" text[],           -- homepage_urls (array)
  "쇼핑몰" text[],             -- shopping_mall_urls (array)
  "유튜브" text,               -- youtube
  "틱톡" text,                 -- tiktok
  "인스타그램" text,           -- instagram
  "페이스북" text,             -- facebook
  "마스터_비밀번호" text default '0000' -- master_password
);

-- 2. 프로필 (Profiles) Table
-- Note: 'id' maps to auth.users.id usually, but here handled by application logic
create table if not exists public."프로필" (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public."회사들"(id),
  user_name text,
  role text check (role in ('OWNER', 'ADMIN', 'STAFF')),
  job_title text,
  phone text,
  created_at timestamptz default now()
);

-- 3. 측정자 (Measurers) Table
create table if not exists public."측정자" (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public."회사들"(id),
  name text not null,
  phone text,
  note text,
  created_at timestamptz default now()
);

-- 4. 설치 기사 (Installers) Table
create table if not exists public."설치 기사" (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public."회사들"(id),
  name text not null,
  phone text,
  note text,
  created_at timestamptz default now()
);

-- RLS Policies (Optional but recommended)
alter table public."회사들" enable row level security;
alter table public."프로필" enable row level security;
alter table public."측정자" enable row level security;
alter table public."설치 기사" enable row level security;

-- For demo/dev purposes, allow public access (or service role will bypass anyway)
-- Adjust these based on your actual auth requirements
create policy "Allow all access for service role" on public."회사들" for all using (true) with check (true);
create policy "Allow all access for service role" on public."프로필" for all using (true) with check (true);
create policy "Allow all access for service role" on public."측정자" for all using (true) with check (true);
create policy "Allow all access for service role" on public."설치 기사" for all using (true) with check (true);
