-- VERIFICAÇÃO DE PRESERVAÇÃO — SOMENTE LEITURA (apenas SELECT). Rode ANTES e DEPOIS da migration 005 e compare as colunas "linhas" e "hash":
-- devem ser IDÊNTICAS em todas as linhas (a 005 só acrescenta stages.is_physical, que este hash deliberadamente NÃO inclui).
-- Mostra só contagens e hashes (nenhum dado de negócio).
select 'projects' as tabela, count(*) as linhas, md5(coalesce(string_agg(t::text, '|' order by t.id), '')) as hash from public.projects t
union all select 'stages (sem is_physical)', count(*), md5(coalesce(string_agg(row(t.id, t.project_id, t.name, t.order_index, t.planned_start, t.planned_end, t.planned_percent, t.actual_percent, t.status, t.created_at, t.updated_at)::text, '|' order by t.id), '')) from public.stages t
union all select 'stage_financials', count(*), md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.stage_financials t
union all select 'media', count(*), md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.media t
union all select 'documents', count(*), md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.documents t
union all select 'project_access', count(*), md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from public.project_access t
union all select 'cava_admins', count(*), md5(coalesce(string_agg(t::text, '|' order by t.user_id), '')) from public.cava_admins t
order by 1;
