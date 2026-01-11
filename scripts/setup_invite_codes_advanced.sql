-- Advanced Invite Code System Setup

-- 1. Ensure Table Exists
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  note text,
  max_uses int not null default 1,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.invite_codes enable row level security;

-- 3. Policies
-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "invite_codes_superadmin_all" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_service_role" ON public.invite_codes;

-- Policy: Only Superadmin can do everything (Select, Insert, Update, Delete)
create policy "invite_codes_superadmin_all"
on public.invite_codes for all
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_superadmin = true
  )
);

-- Policy: Service Role (Server-side) has full access
-- Note: Service Role key bypasses RLS anyway, but good for documentation.

-- 4. RPC: Atomic Consume Function
-- This function is called by the Server API with Service Role
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/superuser) to bypass RLS for the consumer
AS $$
DECLARE
  v_invite public.invite_codes%ROWTYPE;
BEGIN
  -- 1. Lock the row for update to prevent race conditions
  SELECT * INTO v_invite
  FROM public.invite_codes
  WHERE code = p_code
  FOR UPDATE;

  -- 2. Checks
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'message', '존재하지 않는 코드입니다.');
  END IF;

  IF v_invite.is_active = false THEN
    RETURN json_build_object('success', false, 'message', '비활성화된 코드입니다.');
  END IF;

  IF v_invite.used_count >= v_invite.max_uses THEN
    RETURN json_build_object('success', false, 'message', '사용 횟수가 초과된 코드입니다.');
  END IF;

  -- 3. Consume
  UPDATE public.invite_codes
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'message', '코드 사용 성공');
END;
$$;

-- 5. Audit Log Table (If not exists, minimal version)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
