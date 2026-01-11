-- Grant Superadmin Privileges
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요.
-- 'target_email@example.com' 부분을 본인의 이메일로 변경해야 합니다.

UPDATE public.profiles
SET is_superadmin = true
WHERE user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'target_email@example.com'  -- <- 여기를 본인 이메일로 변경
);

-- 확인용 쿼리 (제대로 변경되었는지 확인)
SELECT p.name, u.email, p.is_superadmin 
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE p.is_superadmin = true;
