alter table public.payments
add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists idx_payments_lead_id
on public.payments (lead_id);

create index if not exists idx_payments_status
on public.payments (status);
