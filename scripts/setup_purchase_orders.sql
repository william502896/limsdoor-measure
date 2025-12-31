-- scripts/setup_purchase_orders.sql

-- Drop existing if needed (during dev only, or just alter)
DROP TABLE IF EXISTS public.sc_purchase_orders;

-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS public.sc_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.sc_schedules(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    
    total_amount NUMERIC DEFAULT 0, -- Supply Value (공급가액)
    vat_amount NUMERIC DEFAULT 0,   -- VAT (부가세)
    
    -- Status: ORDERED (발주완료), ARRIVAL_EXPECTED (입고예정), COMPLETED (입고완료/마감), CANCELLED (취소)
    status TEXT CHECK (status IN ('DRAFT', 'ORDERED', 'ARRIVAL_EXPECTED', 'COMPLETED', 'CANCELLED')) DEFAULT 'DRAFT',
    
    -- Logistics
    delivery_method TEXT, -- 'PICKUP' (직접수령), 'FREIGHT' (화물), 'CHARTER' (용차), 'PARCEL' (택배), 'ETC'
    
    -- Dates
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),       -- 발주신청일
    arrival_expected_date TIMESTAMP WITH TIME ZONE,          -- 입고예정일
    arrival_completed_date TIMESTAMP WITH TIME ZONE,         -- 입고완료일
    
    items_json JSONB, -- Detailed array
    
    memo TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sc_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Enable read/write for all" ON public.sc_purchase_orders FOR ALL USING (true) WITH CHECK (true);
