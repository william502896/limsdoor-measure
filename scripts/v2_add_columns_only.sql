-- ⚠️ 이 파일은 오직 "컬럼 추가"만 수행합니다. (중복 오류 방지)
-- Run this in Supabase SQL Editor

ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "주소" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "상세주소" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "우편번호" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "결혼여부" boolean DEFAULT false;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "자녀유무" boolean DEFAULT false;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "취미" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "비상연락망" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "경력사항" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "차량종류" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "차량소유" boolean DEFAULT false;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "차량번호" text;
ALTER TABLE public."인사" ADD COLUMN IF NOT EXISTS "프로필이미지" text;

-- Confirmation
SELECT 'All columns added successfully' as result;
