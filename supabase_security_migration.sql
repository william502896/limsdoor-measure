create table if not exists public.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  actor_user_id uuid,
  actor_email text,

  action text not null,                  -- e.g. SECURE_ENTER, PIN_FAIL, OTP_OK, DANGER_REAUTH_OK
  success boolean not null default false,

  ip text,
  user_agent text,
  path text,

  meta jsonb not null default '{}'::jsonb
);

-- RLS: Security logs should typically be write-only for service_role or restricted
alter table public.admin_security_events enable row level security;

-- Policy: Allow service_role full access (implicit, but good to be aware)
-- We do not add public insert policies as we use supabaseAdmin (service_role) to log events.
