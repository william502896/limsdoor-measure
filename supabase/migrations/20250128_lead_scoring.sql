create table if not exists public.marketing_lead_scores (
  phone text primary key,
  score integer default 0,
  grade text default 'COLD', -- HOT | WARM | COLD
  last_action text,
  last_action_at timestamptz default now(),
  history jsonb default '[]'::jsonb, -- Array of { action, delta, ts }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lead_scores_score on public.marketing_lead_scores(score desc);
create index if not exists idx_lead_scores_grade on public.marketing_lead_scores(grade);
