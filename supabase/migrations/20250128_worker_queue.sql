-- Create Worker Locks Table for concurrency control
create table if not exists public.worker_locks (
  lock_key text primary key,
  locked_until timestamptz not null
);

alter table public.worker_locks enable row level security;

-- Create Marketing Message Queue Table (as requested in Step 3223)
-- This seems to supersede or complement outbound_messages. 
-- Given the fields used in the code:
-- to_phone, msg_type, text, scheduled_at, dedupe_key, status, id
-- provider, provider_message_id, sent_at, fail_reason, campaign_key, trigger_key, to_name

create table if not exists public.marketing_message_queue (
  id uuid primary key default gen_random_uuid(),
  
  to_phone text not null,
  to_name text,
  msg_type text not null default 'SMS', -- SMS | LMS | KAKAO
  text text not null,
  
  status text not null default 'READY', -- READY | SENT | FAILED | CANCELED
  scheduled_at timestamptz not null default now(),
  
  dedupe_key text, -- unique constraint for campaign + day + user
  campaign_key text,
  trigger_key text,
  
  provider text,
  provider_message_id text,
  sent_at timestamptz,
  fail_reason text,
  
  created_at timestamptz not null default now()
);

create unique index if not exists uq_marketing_msg_dedupe
on public.marketing_message_queue (dedupe_key)
where dedupe_key is not null;

create index if not exists idx_marketing_msg_status_schedule
on public.marketing_message_queue (status, scheduled_at);

alter table public.marketing_message_queue enable row level security;
