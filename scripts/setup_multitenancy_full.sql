-- scripts/setup_multitenancy_full.sql
-- COMPLETE MULTI-TENANCY SETUP FOR LIMS DOOR
-- 1. Tables (Companies, Profiles, Members, Flags, Logs)
-- 2. RLS Policies (Strict Isolation)
-- 3. Migration for Existing Data

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-------------------------------------------------------------------------
-- 1. COMPANIES & PROFILES
-------------------------------------------------------------------------

-- Companies Table (Safe Creation)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='name') THEN
        ALTER TABLE public.companies ADD COLUMN name TEXT DEFAULT 'Unnamed Company';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='business_number') THEN
        ALTER TABLE public.companies ADD COLUMN business_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='status') THEN
        ALTER TABLE public.companies ADD COLUMN status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TRIAL_STOPPED'));
    ELSE
        -- Ensure default is set if column exists
        ALTER TABLE public.companies ALTER COLUMN status SET DEFAULT 'ACTIVE';
    END IF;

    -- Relax constraints for migration flexibility (User reported NOT NULL violation on existing table)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='business_number') THEN
        ALTER TABLE public.companies ALTER COLUMN business_number DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='phone') THEN
        ALTER TABLE public.companies ALTER COLUMN phone DROP NOT NULL;
    END IF;

    -- FIX: Existing table might have 'company_name' instead of 'name'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_name') THEN
        ALTER TABLE public.companies ALTER COLUMN company_name DROP NOT NULL;
    END IF;
END $$;

-- Profiles Table (Safe Creation & Migration)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    -- If profiles exists but user_id is missing (maybe using 'id' as FK)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        
        -- Add user_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_id') THEN
             ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- If 'id' exists, copy to 'user_id' for consistency
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='id') THEN
             UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
        END IF;

        -- Ensure is_superadmin exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_superadmin') THEN
             ALTER TABLE public.profiles ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- Company Members (Many-to-Many User <-> Company)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'measurer', 'installer', 'customer')),
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Feature Flags (Kill Switches)
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'COMPANY')),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    key TEXT NOT NULL, -- e.g. 'APP_GLOBAL_STOP'
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scope, company_id, key)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id),
    actor_company_id UUID REFERENCES public.companies(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-------------------------------------------------------------------------
-- 2. MIGRATION for Existing Core Tables
-------------------------------------------------------------------------
-- Add company_id and indexes to core tables
-- Tables: estimates, crm_customers, sc_payments, sc_schedules, products, messages

DO $$ 
DECLARE
    def_company_id UUID;
BEGIN
    -- 1. Create Default 'Genesis' Company if strictly no companies exist
    IF NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1) THEN
        INSERT INTO public.companies (name, status, business_number, phone) 
        VALUES ('무소속(기존데이터)', 'ACTIVE', '000-00-00000', '000-0000-0000') 
        RETURNING id INTO def_company_id;
    ELSE
        SELECT id INTO def_company_id FROM public.companies LIMIT 1;
    END IF;

    -- Sync company_name if exists (Legacy support)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='company_name') THEN
        UPDATE public.companies SET company_name = name WHERE company_name IS NULL;
    END IF;

    -- Helper to safely add column
    -- Table: crm_customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_customers') THEN
        ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
        UPDATE public.crm_customers SET company_id = def_company_id WHERE company_id IS NULL;
        ALTER TABLE public.crm_customers ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_crm_customers_company ON public.crm_customers(company_id);
    END IF;

    -- Table: sc_schedules
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sc_schedules') THEN
        ALTER TABLE public.sc_schedules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
        UPDATE public.sc_schedules SET company_id = def_company_id WHERE company_id IS NULL;
        ALTER TABLE public.sc_schedules ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_sc_schedules_company ON public.sc_schedules(company_id);
    END IF;

    -- Table: estimates (Create if not exists mock)
    CREATE TABLE IF NOT EXISTS public.estimates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
    UPDATE public.estimates SET company_id = def_company_id WHERE company_id IS NULL;
    ALTER TABLE public.estimates ALTER COLUMN company_id SET NOT NULL;

    -- Table: payments (sc_payments or just payments)
    CREATE TABLE IF NOT EXISTS public.payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status TEXT,
        amount NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
    UPDATE public.payments SET company_id = def_company_id WHERE company_id IS NULL;
    ALTER TABLE public.payments ALTER COLUMN company_id SET NOT NULL;

    -- Table: products
    CREATE TABLE IF NOT EXISTS public.products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
    UPDATE public.products SET company_id = def_company_id WHERE company_id IS NULL;
    ALTER TABLE public.products ALTER COLUMN company_id SET NOT NULL;

    -- Table: messages
    CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
    UPDATE public.messages SET company_id = def_company_id WHERE company_id IS NULL;
    ALTER TABLE public.messages ALTER COLUMN company_id SET NOT NULL;

    -- Marketing Assets (AR) - Optional to tenant, but good practice
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_assets') THEN
        ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
        UPDATE public.marketing_assets SET company_id = def_company_id WHERE company_id IS NULL;
        -- Maybe null allowed for System Global Assets
    END IF;
    
END $$;


-------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------

-- Helper function to get current user company_ids
CREATE OR REPLACE FUNCTION get_my_company_ids()
RETURNS TABLE (company_id UUID) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT cm.company_id 
    FROM public.company_members cm
    WHERE cm.user_id = auth.uid() AND cm.approved = true;
END;
$$ LANGUAGE plpgsql;

-- Helper to check superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND is_superadmin = true
    );
END;
$$ LANGUAGE plpgsql;


-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3.1 Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
-- Superadmin can read all
CREATE POLICY "Superadmin read all profiles" ON public.profiles FOR ALL USING (is_superadmin());

-- 3.2 Companies RLS
-- Everyone can read stats of companies they belong to
CREATE POLICY "Read own company" ON public.companies FOR SELECT
    USING (id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- 3.3 Company Members RLS
CREATE POLICY "Read members of my company" ON public.company_members FOR SELECT
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin() OR user_id = auth.uid());
    
-- 3.4 Feature Flags RLS
-- Read: Everyone (needed for app logic)
CREATE POLICY "Read flags" ON public.feature_flags FOR SELECT USING (true);
-- Write: Only Superadmin
CREATE POLICY "Superadmin write flags" ON public.feature_flags FOR ALL USING (is_superadmin());

-- 3.5 Audit Logs RLS
-- Insert: Server side usually bypasses RLS or explicitly allowed
CREATE POLICY "Insert logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
-- Read: Superadmin or Company Admin for own company
CREATE POLICY "Read logs" ON public.audit_logs FOR SELECT
    USING (is_superadmin() OR actor_company_id IN (SELECT get_my_company_ids()));

-- 3.6 Data Tables RLS (Standard Tenant Isolation)
-- Policy Template:
-- "Access my company data"
-- USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin())

-- Apply to crm_customers
DROP POLICY IF EXISTS "Tenant Isolation" ON public.crm_customers;
CREATE POLICY "Tenant Isolation" ON public.crm_customers FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- Apply to sc_schedules
DROP POLICY IF EXISTS "Tenant Isolation" ON public.sc_schedules;
CREATE POLICY "Tenant Isolation" ON public.sc_schedules FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- Apply to estimates
DROP POLICY IF EXISTS "Tenant Isolation" ON public.estimates;
CREATE POLICY "Tenant Isolation" ON public.estimates FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- Apply to payments
DROP POLICY IF EXISTS "Tenant Isolation" ON public.payments;
CREATE POLICY "Tenant Isolation" ON public.payments FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- Apply to products
DROP POLICY IF EXISTS "Tenant Isolation" ON public.products;
CREATE POLICY "Tenant Isolation" ON public.products FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());

-- Apply to messages
DROP POLICY IF EXISTS "Tenant Isolation" ON public.messages;
CREATE POLICY "Tenant Isolation" ON public.messages FOR ALL
    USING (company_id IN (SELECT get_my_company_ids()) OR is_superadmin());


COMMIT;
