-- Add Dual PDF columns and short_key
alter table public.measurements
add column if not exists pdf_office_url text,
add column if not exists pdf_office_path text,
add column if not exists pdf_customer_url text,
add column if not exists pdf_customer_path text,
add column if not exists short_key text;

create index if not exists idx_measurements_short_key on public.measurements(short_key);
단계로 이동하면 사진 