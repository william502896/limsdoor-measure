-- estimate_id로 lead를 빠르게 찾기
create unique index if not exists uq_lead_links_estimate_id
on public.lead_links (estimate_id)
where estimate_id is not null;
