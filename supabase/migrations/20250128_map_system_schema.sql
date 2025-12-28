-- =====================================================
-- 역할별 지도 시스템 데이터베이스 스키마
-- 림스도어 실측 앱 - Supabase/PostgreSQL
-- =====================================================

-- =====================================================
-- 1. measurements 테이블 (메인 실측/견적 데이터)
-- =====================================================
CREATE TABLE IF NOT EXISTS measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 생성자 정보
    created_by_role TEXT NOT NULL CHECK (created_by_role IN ('CONSUMER', 'FIELD', 'ADMIN')),
    created_by_user_id UUID, -- Supabase auth.users 연결
    created_by_name TEXT,
    
    -- 고객 정보
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    
    -- 주소 확정 데이터
    address_text TEXT NOT NULL, -- 확정된 주소 문자열
    lat DECIMAL(10, 8) NOT NULL, -- 위도
    lng DECIMAL(11, 8) NOT NULL, -- 경도
    address_source TEXT CHECK (address_source IN ('PIN_PICK', 'GPS', 'SEARCH')),
    
    -- GPS 증빙 (확정 당시 실제 GPS 좌표)
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    gps_accuracy_m INTEGER, -- GPS 정확도 (미터)
    
    -- 불일치 검증
    distance_mismatch_m INTEGER, -- GPS와 핀 거리 (미터)
    verified_level TEXT DEFAULT 'UNVERIFIED' CHECK (verified_level IN ('UNVERIFIED', 'WARNED', 'CONFIRMED_BY_ADMIN')),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    
    -- 실측 데이터
    width_mm INTEGER,
    height_mm INTEGER,
    door_category TEXT,
    door_type TEXT,
    glass_type TEXT,
    
    -- 상태 관리
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'AS', 'CANCELLED')),
    assigned_to_user_id UUID,
    assigned_to_name TEXT,
    scheduled_date DATE,
    
    -- 추가 메타데이터
    photos JSONB, -- 배열 형태: [{url, type, uploaded_at}]
    memo TEXT,
    
    -- 인덱스 최적화를 위한 필드
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('korean', COALESCE(customer_name, '') || ' ' || COALESCE(address_text, ''))
    ) STORED
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_measurements_status ON measurements(status);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_verified_level ON measurements(verified_level);
CREATE INDEX IF NOT EXISTS idx_measurements_assigned_to ON measurements(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_scheduled_date ON measurements(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_measurements_location ON measurements USING gist(ll_to_earth(lat, lng));
CREATE INDEX IF NOT EXISTS idx_measurements_search ON measurements USING GIN(search_vector);

-- =====================================================
-- 2. address_events 테이블 (주소/좌표 변경 로그)
-- =====================================================
CREATE TABLE IF NOT EXISTS address_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 변경 주체
    actor_role TEXT NOT NULL CHECK (actor_role IN ('CONSUMER', 'FIELD', 'ADMIN')),
    actor_user_id UUID,
    actor_name TEXT NOT NULL,
    
    -- 변경 전
    before_address_text TEXT,
    before_lat DECIMAL(10, 8),
    before_lng DECIMAL(11, 8),
    
    -- 변경 후
    after_address_text TEXT NOT NULL,
    after_lat DECIMAL(10, 8) NOT NULL,
    after_lng DECIMAL(11, 8) NOT NULL,
    
    -- 변경 사유 및 검증
    reason TEXT,
    mismatch_m INTEGER, -- 변경 전후 거리 (미터)
    event_type TEXT CHECK (event_type IN ('INITIAL', 'UPDATE', 'ADMIN_CORRECTION', 'GPS_RECAPTURE'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_address_events_measurement ON address_events(measurement_id);
CREATE INDEX IF NOT EXISTS idx_address_events_created_at ON address_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_address_events_actor ON address_events(actor_user_id);

-- =====================================================
-- 3. address_change_requests 테이블 (주소 변경 승인 워크플로우)
-- =====================================================
CREATE TABLE IF NOT EXISTS address_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    measurement_id UUID NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 요청자
    requested_by_role TEXT NOT NULL CHECK (requested_by_role IN ('FIELD', 'CONSUMER')),
    requested_by_user_id UUID,
    requested_by_name TEXT NOT NULL,
    
    -- 제안된 변경 내용
    proposed_address_text TEXT NOT NULL,
    proposed_lat DECIMAL(10, 8) NOT NULL,
    proposed_lng DECIMAL(11, 8) NOT NULL,
    proposed_source TEXT CHECK (proposed_source IN ('PIN_PICK', 'GPS', 'SEARCH')),
    
    -- 현재 값 (스냅샷)
    current_address_text TEXT NOT NULL,
    current_lat DECIMAL(10, 8) NOT NULL,
    current_lng DECIMAL(11, 8) NOT NULL,
    
    -- 요청 사유
    reason TEXT NOT NULL,
    distance_change_m INTEGER, -- 현재 위치와 제안 위치 거리
    
    -- 승인/반려
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id UUID,
    reviewed_by_name TEXT,
    review_note TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_change_requests_measurement ON address_change_requests(measurement_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON address_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_created_at ON address_change_requests(created_at DESC);

-- =====================================================
-- 4. RLS (Row Level Security) 정책
-- =====================================================

-- measurements 테이블
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- 소비자: 본인이 생성한 건만 읽기/쓰기
CREATE POLICY consumer_measurements_policy ON measurements
    FOR ALL
    USING (
        created_by_user_id = auth.uid() AND created_by_role = 'CONSUMER'
    );

-- 시공자: 배정된 건 읽기/업데이트
CREATE POLICY field_measurements_policy ON measurements
    FOR SELECT
    USING (
        assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid()
    );

CREATE POLICY field_measurements_update_policy ON measurements
    FOR UPDATE
    USING (
        assigned_to_user_id = auth.uid()
    );

-- 관리자: 전체 읽기/쓰기
CREATE POLICY admin_measurements_policy ON measurements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- address_events 테이블
ALTER TABLE address_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY address_events_read_policy ON address_events
    FOR SELECT
    USING (
        -- 해당 measurement에 접근 가능한 사용자만
        EXISTS (
            SELECT 1 FROM measurements m
            WHERE m.id = address_events.measurement_id
            AND (
                m.created_by_user_id = auth.uid()
                OR m.assigned_to_user_id = auth.uid()
                OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
            )
        )
    );

-- address_change_requests 테이블
ALTER TABLE address_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY change_requests_read_policy ON address_change_requests
    FOR SELECT
    USING (
        requested_by_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

CREATE POLICY change_requests_create_policy ON address_change_requests
    FOR INSERT
    WITH CHECK (
        requested_by_user_id = auth.uid()
    );

CREATE POLICY change_requests_admin_update_policy ON address_change_requests
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- =====================================================
-- 5. 유용한 함수들
-- =====================================================

-- 거리 계산 함수 (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_m(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
) RETURNS INTEGER AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000; -- Earth radius in meters
    dLat DECIMAL;
    dLng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLng := RADIANS(lng2 - lng1);
    
    a := SIN(dLat/2) * SIN(dLat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLng/2) * SIN(dLng/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN ROUND(R * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 자동 거리 불일치 계산 트리거
CREATE OR REPLACE FUNCTION update_distance_mismatch()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gps_lat IS NOT NULL AND NEW.gps_lng IS NOT NULL THEN
        NEW.distance_mismatch_m := calculate_distance_m(
            NEW.lat, NEW.lng, NEW.gps_lat, NEW.gps_lng
        );
        
        -- 300m 이상이면 자동 경고
        IF NEW.distance_mismatch_m >= 300 AND NEW.verified_level = 'UNVERIFIED' THEN
            NEW.verified_level := 'WARNED';
        END IF;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_distance_mismatch
    BEFORE INSERT OR UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_distance_mismatch();

-- =====================================================
-- 6. 초기 데이터 / 샘플 (선택사항)
-- =====================================================
-- 이 부분은 개발 환경에서만 실행
-- INSERT INTO measurements (...) VALUES (...);
