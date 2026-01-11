
-- 1. Fix Legacy Table Schema
ALTER TABLE "public"."프로필" ADD COLUMN IF NOT EXISTS "is_superadmin" boolean DEFAULT false;

-- 2. Clean up Duplicates in 'profiles' (Keep the most recent one)
-- Identify duplicates by user_id
DELETE FROM "public"."profiles"
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as row_num
        FROM "public"."profiles"
    ) t
    WHERE t.row_num > 1
);

-- 3. Grant Superadmin Rights
UPDATE "public"."profiles"
SET "is_superadmin" = true, "role" = 'OWNER'
WHERE "email" = 'ceo122278@gmail.com';

UPDATE "public"."프로필"
SET "is_superadmin" = true
WHERE "id" IN (
    SELECT id FROM auth.users WHERE email = 'ceo122278@gmail.com'
);

-- 4. Verify
SELECT email, is_superadmin FROM "public"."profiles" WHERE email = 'ceo122278@gmail.com';
