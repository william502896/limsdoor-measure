-- outbound_messages: 발송 큐
create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid references public.leads(id) on delete cascade,
  funnel_id uuid references public.funnels(id) on delete set null,

  channel text not null default 'SMS',         -- SMS | KAKAO | EMAIL
  to_phone text,
  to_email text,

  title text not null default '',
  body text not null default '',

  status text not null default 'QUEUED',       -- QUEUED | SENDING | SENT | FAILED | CANCELED
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  fail_reason text,

  provider text not null default 'MOCK',       -- MOCK | SOLAPI | ALIGO | ...
  provider_message_id text,

  created_at timestamptz not null default now()
);

create index if not exists idx_outbound_messages_scheduled
on public.outbound_messages (status, scheduled_at);

-- (선택) 메시지 템플릿 저장용
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,                  -- e.g. A_IMMEDIATE, C_FOLLOWUP_48H
  channel text not null default 'SMS',
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

alter table public.outbound_messages enable row level security;
alter table public.message_templates enable row level security;
