-- Rename table FK reference from "회사들" to "companies"

-- 0. PRE-CLEANUP: Delete orphaned rows that reference non-existent companies
-- This prevents "Key (company_id)=... is not present in table companies" error when adding FK.
DELETE FROM public."프로필" WHERE company_id NOT IN (SELECT id FROM public.companies);
DELETE FROM public."측정자" WHERE company_id NOT IN (SELECT id FROM public.companies);
DELETE FROM public."설치 기사" WHERE company_id NOT IN (SELECT id FROM public.companies);

-- 1. Drop the old constraint (references "회사들")
ALTER TABLE public."프로필" 
DROP CONSTRAINT IF EXISTS "프로필_company_id_fkey";

-- 2. Add new constraint (references "companies")
-- Assumes "companies" table exists and has "id" as primary key
ALTER TABLE public."프로필"
ADD CONSTRAINT "프로필_company_id_fkey" 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;

-- Optional: If "측정자" and "설치 기사" also reference "회사들", update them too
ALTER TABLE public."측정자"
DROP CONSTRAINT IF EXISTS "측정자_company_id_fkey";

ALTER TABLE public."측정자"
ADD CONSTRAINT "측정자_company_id_fkey"
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE CASCADE;

ALTER TABLE public."설치 기사"
DROP CONSTRAINT IF EXISTS "설치 기사_company_id_fkey";

ALTER TABLE public."설치 기사"
ADD CONSTRAINT "설치 기사_company_id_fkey"
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE CASCADE;
