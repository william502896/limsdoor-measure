create table if not exists public.marketing_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  trigger_type text not null, -- PDF_DOWNLOAD | CONSULT_COMPLETE | MEASURE_COMPLETE
  wait_minutes integer default 60,
  message_template text, 
  is_active boolean default true,
  stats jsonb default '{"triggered": 0, "completed": 0}'::jsonb,
  created_at timestamptz default now()
);

-- Pre-seed default scenarios
insert into public.marketing_scenarios (title, trigger_type, wait_minutes, message_template)
values 
  ('시나리오 A: PDF 후속 상담 유도', 'PDF_DOWNLOAD', 60, '자료는 도움이 되셨나요? 설치 환경에 따라 비용 차이가 큽니다. 무료 상담으로 정확히 안내드릴게요.'),
  ('시나리오 C: 상담 완료 후 실측 유도', 'CONSULT_COMPLETE', 0, '정확한 견적을 위해 현장 실측이 필요합니다. 방문 일정을 선택해주세요.'),
  ('시나리오 D: 실측 완료 후 결제 유도', 'MEASURE_COMPLETE', 120, '실측 결과에 따른 견적을 안내드립니다. 일정 확정을 위해 결제를 진행해주세요.');
