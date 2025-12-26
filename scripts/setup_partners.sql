-- 거래처(partners) 테이블 생성
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('supplier', 'customer', 'both')), -- 매입 / 매출 / 공통
  status TEXT DEFAULT 'active',
  name TEXT NOT NULL,
  business_number TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  address TEXT,
  memo TEXT
);

-- RLS 활성화 (보안)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- 데모용: 모든 사용자(비로그인 포함)에게 읽기/쓰기 허용 (개발 편의성)
CREATE POLICY "Enable read access for all users" ON partners FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON partners FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON partners FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON partners FOR DELETE USING (true);
