-- 1) measurements: 실측 메인
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz not null default now(),

  -- 고객
  customer_name text not null,
  customer_phone text not null,
  customer_address text,

  -- 실측자/사무실
  measurer_name text,
  measurer_phone text,
  office_phone text,
  office_email text,

  -- 옵션
  category text not null,
  detail text not null,
  glass text not null,
  design text not null,
  open_direction text not null,

  -- 실측 값
  width_mm integer not null default 0,
  height_mm integer not null default 0,
  mm_per_px double precision not null default 1,
  corners jsonb,               -- {TL:{x,y},TR...,BR...,BL...}
  source text not null default 'photo',  -- camera|photo

  -- 이미지(캡처/업로드 대표)
  image_data_url text,          -- base64 dataURL 저장(원하면 제거 가능)
  primary_image_url text,       -- storage public url

  -- 메모/전송
  memo text,
  send_target text not null default 'both' -- office|customer|both
);

create index if not exists idx_measurements_created_at on public.measurements(created_at desc);
create index if not exists idx_measurements_customer_phone on public.measurements(customer_phone);

-- 2) measurement_photos: 추가 사진들(여러 장)
create table if not exists public.measurement_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  public_url text not null
);

create index if not exists idx_measurement_photos_measurement_id on public.measurement_photos(measurement_id);

-- ✅ RLS: 지금은 "서비스 롤"로만 쓰면, RLS 켜도 됨(정석)
alter table public.measurements enable row level security;
alter table public.measurement_photos enable row level security;

-- Storage Bucket Creation (Attempt via SQL)
insert into storage.buckets (id, name, public) 
values ('measurements', 'measurements', true)
on conflict (id) do nothing;

-- Storage Policies (Public Read)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'measurements' );

create policy "Auth Upload"
  on storage.objects for insert
  with check ( bucket_id = 'measurements' );
