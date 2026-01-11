-- Add Automation fields
alter table public.measurements
add column if not exists send_logs jsonb,
add column if not exists pdf_url text,
add column if not exists pdf_path text;
