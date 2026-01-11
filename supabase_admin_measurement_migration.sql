-- Add Admin fields and updated_at to measurements table
alter table public.measurements
add column if not exists admin_status text default 'PENDING',
add column if not exists admin_note text,
add column if not exists updated_at timestamptz default now();

-- Create trigger for updated_at if not exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.measurements;
create trigger set_updated_at
before update on public.measurements
for each row execute procedure public.handle_updated_at();
