-- 템플릿 테이블 확장: 버튼/검증용 스키마
alter table public.marketing_kakao_templates
  add column if not exists buttons jsonb not null default '[]'::jsonb,
  add column if not exists required_variables text[] not null default '{}'::text[],
  add column if not exists strict_variables boolean not null default true;

-- 큐 테이블 확장: 버튼 오버라이드(선택)
alter table public.marketing_message_queue
  add column if not exists kakao_buttons jsonb not null default '[]'::jsonb;
