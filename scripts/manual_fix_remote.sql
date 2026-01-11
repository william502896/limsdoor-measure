
-- ⚠️ 실행 방법: Supabase 대시보드 -> SQL Editor -> 새 쿼리 -> 붙여넣기 -> RUN
-- ⚠️ Instructions: Supabase Dashboard -> SQL Editor -> New Query -> Paste -> RUN

BEGIN;

-- 1. [핵심] 방해되는 모든 제약조건(Foreign Key) 제거
-- "users" 테이블이 비어있거나 동기화가 안 되어 있어서 에러가 납니다. 연결을 끊어버립니다.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- 2. 컬럼 강제 추가 (없는 경우 대비)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_name text;

-- 3. 기존 데이터 정리
DELETE FROM public.profiles 
WHERE user_id = '2866a96b-d8db-42d6-8884-f9b42cdfdd1f';

DELETE FROM public.profiles 
WHERE id = '2866a96b-d8db-42d6-8884-f9b42cdfdd1f';

-- 4. 슈퍼어드민 권한 부여 (Insert)
INSERT INTO public.profiles (
    id, 
    user_id, 
    email, 
    user_name, 
    is_superadmin, 
    role
)
VALUES (
  '2866a96b-d8db-42d6-8884-f9b42cdfdd1f', 
  '2866a96b-d8db-42d6-8884-f9b42cdfdd1f', 
  'ceo122278@gmail.com',
  'Super Admin',
  true, 
  'OWNER'
);

COMMIT;

-- 5. 결과 확인
SELECT * FROM public.profiles WHERE id = '2866a96b-d8db-42d6-8884-f9b42cdfdd1f';
