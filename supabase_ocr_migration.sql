-- Add OCR columns to documents and secret_documents

-- 1. documents table
alter table public.documents
add column if not exists ocr_status text default 'NONE', -- NONE, PROCESSING, DONE, FAILED
add column if not exists extracted_text text,
add column if not exists ocr_json jsonb;

-- 2. secret_documents table
alter table public.secret_documents
add column if not exists ocr_status text default 'NONE',
add column if not exists extracted_text text,
add column if not exists ocr_json jsonb;
