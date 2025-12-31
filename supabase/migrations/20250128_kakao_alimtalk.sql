-- =============================
-- 1) 카카오 알림톡 템플릿 관리 테이블
-- =============================
create table if not exists public.marketing_kakao_templates (
  id uuid primary key default gen_random_uuid(),

  -- 앱 내부에서 부르는 키 (예: ORDER_CONFIRM, DEPOSIT_GUIDE)
  template_key text unique not null,

  -- SOLAPI용
  pf_id text not null,            -- 카카오 채널(PF) ID
  template_id text not null,      -- SOLAPI templateId

  -- 템플릿 원문(변수 포함) - 운영/검수용 저장
  content text not null,

  -- 변수 스키마(선택): ["customerName","date","amount"]
  variables text[] not null default '{}',

  -- 실패 시 문자 대체발송 여부/대체 문구
  enable_sms_fallback boolean not null default true,
  fallback_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_kakao_templates_updated_at on public.marketing_kakao_templates;
create trigger trg_kakao_templates_updated_at
before update on public.marketing_kakao_templates
for each row execute function public.set_updated_at();


-- =============================
-- 2) 메시지 큐에 “알림톡 전용 필드” 추가
-- =============================
alter table public.marketing_message_queue
  add column if not exists kakao_template_key text,
  add column if not exists kakao_pf_id text,
  add column if not exists kakao_template_id text,
  add column if not exists kakao_variables jsonb not null default '{}'::jsonb,
  add column if not exists sms_fallback_text text,
  add column if not exists disable_sms boolean not null default false;

create index if not exists idx_mmqueue_kakao
on public.marketing_message_queue (msg_type, kakao_template_id, status);
