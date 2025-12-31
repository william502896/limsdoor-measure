-- 1. Transaction Invoices Table
create table if not exists public.transaction_invoices (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid references public.partners(id),
    file_url text,
    status text default 'uploaded', -- 'uploaded', 'parsing', 'review_needed', 'approved'
    ocr_raw_data jsonb,
    created_at timestamptz default now()
);

-- 2. Invoice Items Table (Parsed Items)
create table if not exists public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid references public.transaction_invoices(id) on delete cascade,
    
    raw_item_name text not null,
    mapped_item_id uuid references public.items(id), -- Nullable if not yet mapped
    
    quantity numeric default 0,
    unit_price numeric default 0,
    total_amount numeric default 0,
    
    confidence_score numeric default 0, -- OCR confidence
    status text default 'pending', -- 'pending', 'confirmed'
    
    created_at timestamptz default now()
);

-- RLS Policies
alter table public.transaction_invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "Allow all for invoices" on public.transaction_invoices for all using (true) with check (true);
create policy "Allow all for invoice_items" on public.invoice_items for all using (true) with check (true);

-- Indexes
create index if not exists idx_invoice_partner on public.transaction_invoices(partner_id);
create index if not exists idx_invoice_item_invoice on public.invoice_items(invoice_id);
