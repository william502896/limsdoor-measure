-- scripts/setup_ops_console_final.sql
-- SUPERADMIN OPS CONSOLE - COMPLETE SCHEMA
-- Covers: Companies, Members, Flags, Logs, Invites, Profiles

BEGIN;

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------------------------------
-- 1. COMPANIES & MEMBERS
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'measurer', 'installer', 'customer')),
    approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

--------------------------------------------------------------------------------
-- 2. FEATURE FLAGS (KILL SWITCHES)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'COMPANY')),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    key TEXT NOT NULL, 
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scope, company_id, key)
);
-- Ensure GLOBAL flags exist
INSERT INTO public.feature_flags (scope, key, enabled, reason)
VALUES 
 ('GLOBAL', 'APP_GLOBAL_STOP', false, 'System Init'),
 ('GLOBAL', 'PAYMENTS_STOP', false, 'System Init'),
 ('GLOBAL', 'MESSAGING_STOP', false, 'System Init'),
 ('GLOBAL', 'AR_STOP', false, 'System Init')
ON CONFLICT (scope, company_id, key) DO NOTHING;

--------------------------------------------------------------------------------
-- 3. AUDIT LOGS
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    company_id UUID, -- Optional: if action relates to a company
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

--------------------------------------------------------------------------------
-- 4. INVITE CODES
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    note TEXT,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for invite_codes updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invite_codes_modtime ON public.invite_codes;
CREATE TRIGGER update_invite_codes_modtime BEFORE UPDATE ON public.invite_codes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

--------------------------------------------------------------------------------
-- 5. PROFILES (Superadmin Identification)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    company_id UUID, -- Optional denormalization
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6. RPC: Atomic Invite Consumption
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_invite_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check and Lock Row
  SELECT id INTO v_id
  FROM public.invite_codes
  WHERE code = p_code 
    AND is_active = true 
    AND used_count < max_uses
  FOR UPDATE;

  IF v_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update
  UPDATE public.invite_codes
  SET used_count = used_count + 1
  WHERE id = v_id;

  RETURN TRUE;
END;
$$;

--------------------------------------------------------------------------------
-- 7. RLS POLICIES (Security)
--------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper Function: is_superadmin()
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true);
END;
$$ LANGUAGE plpgsql;

-- Policies
-- Companies: Superadmin read all, Users read own (via member check)
CREATE POLICY "Superadmin Full Access Companies" ON public.companies FOR ALL USING (is_superadmin());
CREATE POLICY "Members Read Own Company" ON public.companies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = id AND cm.user_id = auth.uid())
);

-- Members
CREATE POLICY "Superadmin Full Access Members" ON public.company_members FOR ALL USING (is_superadmin());
CREATE POLICY "Members Read Colleagues" ON public.company_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = company_id AND cm.user_id = auth.uid())
);

-- Feature Flags: Everyone Read (for app logic), Superadmin Write
CREATE POLICY "Everyone Read Flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Superadmin Write Flags" ON public.feature_flags FOR ALL USING (is_superadmin());

-- Audit Logs: Superadmin Read All
CREATE POLICY "Superadmin Read Logs" ON public.audit_logs FOR SELECT USING (is_superadmin());
CREATE POLICY "System Insert Logs" ON public.audit_logs FOR INSERT WITH CHECK (true); -- Usually done by service role, but allow authenticated users to log if needed? Better restrict to service role or superadmin? Let's allow insert for now to be safe with RLS off on insert or service role usage.
-- Ideally logs are written by server actions using Service Role which bypasses RLS.

-- Invite Codes: Superadmin Full Access
CREATE POLICY "Superadmin Manage Invites" ON public.invite_codes FOR ALL USING (is_superadmin());

-- Profiles: Read Own, Superadmin Read All
CREATE POLICY "Read Own Profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Superadmin Read All Profiles" ON public.profiles FOR ALL USING (is_superadmin());

COMMIT;
