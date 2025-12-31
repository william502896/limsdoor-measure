-- 상태 확장: READY | SENDING | SENT | FAILED | SKIPPED
-- 운영용 컬럼 추가
alter table public.marketing_message_queue
  add column if not exists sending_at timestamptz,
  add column if not exists attempts integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error_at timestamptz,
  add column if not exists last_error text;

-- 조회 최적화 인덱스(READY/RETRY)
create index if not exists idx_mmqueue_ready_retry
on public.marketing_message_queue (status, scheduled_at, next_retry_at);

create index if not exists idx_mmqueue_sending_at
on public.marketing_message_queue (status, sending_at);

-- (선택) status 값이 이상하게 들어오는 것 방지: 체크 제약
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mmqueue_status_check'
  ) then
    alter table public.marketing_message_queue
    add constraint mmqueue_status_check
    check (status in ('READY','SENDING','SENT','FAILED','SKIPPED'));
  end if;
end $$;
