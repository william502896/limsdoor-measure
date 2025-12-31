-- scripts/setup_partners_advanced.sql

-- 1. Extend Partners Table
-- Check if columns exist before adding to avoid errors on re-run
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='ceo_name') THEN
        ALTER TABLE public.partners ADD COLUMN ceo_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='email') THEN
        ALTER TABLE public.partners ADD COLUMN email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='fax') THEN
        ALTER TABLE public.partners ADD COLUMN fax text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='homepage') THEN
        ALTER TABLE public.partners ADD COLUMN homepage text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='industry') THEN
        ALTER TABLE public.partners ADD COLUMN industry text; -- 업태
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='sector') THEN
        ALTER TABLE public.partners ADD COLUMN sector text; -- 종목
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partners' AND column_name='biz_license_url') THEN
        ALTER TABLE public.partners ADD COLUMN biz_license_url text; -- 사업자등록증 이미지
    END IF;
END $$;

-- 2. Partner Staff Table (담당자/직원 목록)
CREATE TABLE IF NOT EXISTS public.partner_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT, -- 직급/부서
    mobile TEXT,   -- 휴대폰
    email TEXT,
    note TEXT,
    is_primary BOOLEAN DEFAULT false, -- 대표 담당자 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Partner Attachments Table (명함, 통장사본 등 기타 파일)
CREATE TABLE IF NOT EXISTS public.partner_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    file_type TEXT CHECK (file_type IN ('biz_card', 'bank_book', 'contract', 'etc')), -- 명함, 통장, 계약서, 기타
    file_url TEXT NOT NULL,
    description TEXT,
    extracted_data JSONB, -- OCR로 읽은 데이터 원본 저장 (선택)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.partner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for all" ON public.partner_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write for all" ON public.partner_attachments FOR ALL USING (true) WITH CHECK (true);
