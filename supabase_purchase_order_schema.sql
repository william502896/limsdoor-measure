-- Purchase Order Management Schema
-- 협력업체 (Partners) 테이블
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    business_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM 고객 테이블
CREATE TABLE IF NOT EXISTS public.crm_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일정 테이블
CREATE TABLE IF NOT EXISTS public.sc_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    customer_id UUID REFERENCES public.crm_customers(id),
    scheduled_date DATE,
    scheduled_time TIME,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 구매 발주 테이블
CREATE TABLE IF NOT EXISTS public.sc_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.sc_schedules(id),
    partner_id UUID REFERENCES public.partners(id),
    status TEXT DEFAULT 'ORDERED',
    delivery_method TEXT,
    arrival_expected_date DATE,
    arrival_completed_date TIMESTAMPTZ,
    total_amount NUMERIC(12, 2),
    items_json JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sc_purchase_orders_schedule ON public.sc_purchase_orders(schedule_id);
CREATE INDEX IF NOT EXISTS idx_sc_purchase_orders_partner ON public.sc_purchase_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_sc_purchase_orders_status ON public.sc_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_sc_schedules_customer ON public.sc_schedules(customer_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sc_purchase_orders ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자에게 접근 허용 (간단한 정책)
-- 기존 정책이 있다면 먼저 삭제
DROP POLICY IF EXISTS "Allow authenticated users" ON public.partners;
DROP POLICY IF EXISTS "Allow authenticated users" ON public.crm_customers;
DROP POLICY IF EXISTS "Allow authenticated users" ON public.sc_schedules;
DROP POLICY IF EXISTS "Allow authenticated users" ON public.sc_purchase_orders;

-- 새 정책 생성
CREATE POLICY "Allow authenticated users" ON public.partners FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON public.crm_customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON public.sc_schedules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users" ON public.sc_purchase_orders FOR ALL USING (auth.role() = 'authenticated');

-- 스키마 리로드
NOTIFY pgrst, 'reload schema';
