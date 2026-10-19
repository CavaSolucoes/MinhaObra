-- CAVA+ — MIGRATION 005: medições periódicas da execução física (ADITIVA)
-- Revisar antes de executar. Rodar UMA vez no SQL Editor do Supabase. Não apaga nem recria tabelas existentes e não mexe em RLS/policies existentes.
-- ÚNICA alteração em tabela existente: stages ganha a coluna is_physical (seção 0). Nenhuma linha existente é modificada.
-- Regra: todas as etapas têm peso igual; avanço global = média aritmética dos % das etapas da medição (nenhum valor financeiro).
-- Etapa FÍSICA x item ORÇAMENTÁRIO: só etapas com is_physical = true entram nas medições, na média, na sincronização de actual_percent e no avanço.
-- Itens com is_physical = false (ex.: "Lucro presumido") continuam no orçamento/Financeiro. Nada é classificado automaticamente: todas começam true.
-- Permissões (mínimo necessário): anon = nada nas tabelas; authenticated = somente SELECT (e o RLS limita a administradores); service_role = somente SELECT.
-- Toda gravação e a auditoria passam por save_measurement() (SECURITY DEFINER, executa como DONO das tabelas, valida administrador).

-- 0) CLASSIFICAÇÃO DAS ETAPAS (única alteração em tabela existente) --------------------------------------------------------------
-- ADD COLUMN com DEFAULT constante é instantâneo no PostgreSQL 11+: não reescreve a tabela, não dispara triggers, não altera nenhuma linha existente
-- (nem updated_at). Todas as etapas atuais ficam is_physical = true; quem marca false é o administrador, no painel ("Etapa física").
alter table public.stages add column is_physical boolean not null default true;
comment on column public.stages.is_physical is 'true = etapa física (entra nas medições e no avanço); false = item orçamentário (somente orçamento/Financeiro)';

-- 1) TABELAS NOVAS --------------------------------------------------------------------------------------------------
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reference_date date not null,
  notes text,                                              -- observações INTERNAS (nunca expostas ao cliente)
  progress_percent numeric(7,4) not null check (progress_percent >= 0 and progress_percent <= 100),   -- média aritmética calculada pelo banco e gravada (retrato histórico)
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unique (project_id, reference_date)                      -- uma medição por obra e data; para corrigir, edita-se
);
create table public.measurement_items (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  stage_id uuid references public.stages(id) on delete set null,   -- etapa excluída depois: o item permanece (stage_id vira nulo) e o histórico não muda
  stage_name text not null,                                -- retrato do nome na data da medição
  stage_order integer not null,                            -- retrato da posição
  actual_percent numeric not null check (actual_percent >= 0 and actual_percent <= 100),   -- percentual ACUMULADO executado na data de referência
  unique (measurement_id, stage_id)
);
create table public.measurement_audit (
  id bigint generated always as identity primary key,
  measurement_id uuid,
  project_id uuid not null,
  action text not null check (action in ('create', 'update')),
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb not null
);
create index measurements_project_date_idx on public.measurements (project_id, reference_date);
create index measurement_items_measurement_idx on public.measurement_items (measurement_id);
create index measurement_items_stage_idx on public.measurement_items (stage_id);
create index measurement_audit_measurement_idx on public.measurement_audit (measurement_id, changed_at);

-- 2) RLS + PERMISSÕES: admin SÓ LÊ; a gravação acontece exclusivamente pelas funções abaixo (atômicas, com auditoria). Sem política para anon. -------
alter table public.measurements enable row level security;
alter table public.measurement_items enable row level security;
alter table public.measurement_audit enable row level security;
create policy admin_read on public.measurements for select to authenticated using (public.is_admin());
create policy admin_read on public.measurement_items for select to authenticated using (public.is_admin());
create policy admin_read on public.measurement_audit for select to authenticated using (public.is_admin());

-- O Supabase concede por padrão ALL (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER[, MAINTAIN]) a anon, authenticated e service_role
-- sobre objetos novos do schema public. Zeramos tudo e devolvemos só o necessário. As funções SECURITY DEFINER executam como o DONO das tabelas
-- (quem roda esta migration), que mantém todos os privilégios: por isso a gravação e a auditoria funcionam sem nenhum acesso direto pela API.
revoke all on table public.measurements, public.measurement_items, public.measurement_audit from public, anon, authenticated;
grant select on table public.measurements, public.measurement_items, public.measurement_audit to authenticated;   -- leitura direta; o RLS (admin_read) restringe a administradores
do $$
declare seq text := pg_get_serial_sequence('public.measurement_audit', 'id');
begin
  execute format('revoke all on sequence %s from public, anon, authenticated', seq);                             -- a sequência da auditoria só é usada pelo dono (dentro da função)
  if exists (select 1 from pg_roles where rolname = 'service_role') then                                         -- chave de servidor: apenas leitura; nunca grava direto (auditoria)
    revoke all on table public.measurements, public.measurement_items, public.measurement_audit from service_role;
    grant select on table public.measurements, public.measurement_items, public.measurement_audit to service_role;
    execute format('revoke all on sequence %s from service_role', seq);
  end if;
end $$;

-- 3) FUNÇÕES INTERNAS (não executáveis pela API) ----------------------------------------------------------------------
create or replace function public.project_id_for_token(p_token text) returns uuid
language sql stable security definer set search_path = extensions, public as   -- digest() vem do pgcrypto; demais objetos são qualificados
$$ select project_id from public.project_access where token_hash = encode(digest(p_token, 'sha256'), 'hex') and active $$;

create or replace function public.measurement_snapshot(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as
$$ select jsonb_build_object('reference_date', m.reference_date, 'notes', m.notes, 'progress_percent', m.progress_percent,
     'items', coalesce((select jsonb_agg(jsonb_build_object('stage_id', i.stage_id, 'stage_name', i.stage_name, 'actual_percent', i.actual_percent) order by i.stage_order, i.stage_name)
                        from public.measurement_items i where i.measurement_id = m.id), '[]'::jsonb))
   from public.measurements m where m.id = p_id $$;
revoke all on function public.project_id_for_token(text) from public, anon, authenticated;
revoke all on function public.measurement_snapshot(uuid) from public, anon, authenticated;

-- 4) SALVAR MEDIÇÃO (criar ou editar) — UMA transação; qualquer erro desfaz tudo ----------------------------------------------
-- p_items = [{"stage_id": "<uuid>", "actual_percent": 0..100}, ...]
--  * criar (p_measurement nulo): exige TODAS as etapas atuais da obra, uma vez cada; grava retrato de nome/posição.
--  * editar: só altera percentuais dos itens que a medição já tem e cujas etapas ainda existem; etapas novas e excluídas não entram/saem.
--  * o avanço global é recalculado AQUI (o valor do frontend é ignorado).
--  * sincronização do estado atual (stages.actual_percent) com a medição MAIS RECENTE da obra, identificada DEPOIS da alteração:
--      sincroniza quando (a) a medição salva passou a ser a mais recente, ou (b) a mais recente MUDOU por causa desta operação
--      (ex.: a mais recente foi movida para uma data anterior => a que ficou mais recente é a fonte).
--      Não sincroniza quando a mais recente continua a mesma e não é a medição salva (criar/editar medição antiga preserva o estado atual).
--      Só etapas presentes na medição-fonte E ainda físicas (is_physical) são atualizadas; etapas criadas depois dela ficam como estão.
--  * criar: exige exatamente as etapas FÍSICAS da obra (itens orçamentários são recusados); obra sem etapa física não admite medição.
--  * editar: os itens da medição são um retrato histórico — continuam os mesmos mesmo que a etapa seja reclassificada depois.
create or replace function public.save_measurement(p_project uuid, p_reference_date date, p_notes text, p_items jsonb, p_measurement uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_m public.measurements%rowtype; v_old jsonb; v_avg numeric; v_n int; v_old_latest uuid; v_latest uuid; v_synced_from uuid; v_new boolean := (p_measurement is null);
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_reference_date is null then raise exception 'Informe a data de referência.'; end if;
  -- limites: de 01/01/2000 até HOJE, inclusive, no fuso de Fortaleza (UTC-3, sem horário de verão). Uma data futura/absurda (ex.: ano digitado
  -- errado) viraria a "mais recente" e travaria a sincronização das etapas.
  if p_reference_date < date '2000-01-01' then raise exception 'A data de referência não pode ser anterior a 01/01/2000.'; end if;
  if p_reference_date > (now() at time zone 'America/Fortaleza')::date then raise exception 'A data de referência não pode ser futura.'; end if;
  if char_length(coalesce(p_notes, '')) > 5000 then raise exception 'As observações podem ter no máximo 5000 caracteres.'; end if;
  perform 1 from public.projects where id = p_project for update;                       -- serializa medições da mesma obra
  if not found then raise exception 'Obra não encontrada.'; end if;
  if v_new and not exists (select 1 from public.stages where project_id = p_project and is_physical) then
    raise exception 'A obra não tem etapas físicas: marque ao menos uma etapa como "Etapa física" para criar medições.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Informe os percentuais das etapas.'; end if;
  select id into v_old_latest from public.measurements where project_id = p_project order by reference_date desc limit 1;   -- mais recente ANTES da operação
  if exists (select 1 from jsonb_array_elements(p_items) e where (e->>'stage_id') is null or (e->>'actual_percent') is null) then raise exception 'Cada item precisa de etapa e percentual.'; end if;
  if jsonb_array_length(p_items) <> (select count(distinct e->>'stage_id') from jsonb_array_elements(p_items) e) then raise exception 'Etapa repetida na medição.'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where (e->>'actual_percent')::numeric < 0 or (e->>'actual_percent')::numeric > 100) then raise exception 'Cada percentual deve estar entre 0 e 100.'; end if;

  if v_new then
    if exists (select 1 from jsonb_array_elements(p_items) e join public.stages s on s.id = (e->>'stage_id')::uuid and s.project_id = p_project where not s.is_physical) then
      raise exception 'Itens orçamentários (etapa não física) não entram nas medições.'; end if;
    select count(*) into v_n from public.stages where project_id = p_project and is_physical;
    if jsonb_array_length(p_items) <> v_n or exists (select 1 from jsonb_array_elements(p_items) e where not exists (select 1 from public.stages s where s.id = (e->>'stage_id')::uuid and s.project_id = p_project and s.is_physical)) then
      raise exception 'A medição deve conter todas as etapas físicas da obra (uma vez cada).'; end if;
    begin
      insert into public.measurements (project_id, reference_date, notes, progress_percent) values (p_project, p_reference_date, nullif(trim(p_notes), ''), 0) returning * into v_m;
    exception when unique_violation then raise exception 'Já existe uma medição desta obra nesta data. Abra-a para editar.'; end;
    insert into public.measurement_items (measurement_id, stage_id, stage_name, stage_order, actual_percent)
      select v_m.id, s.id, s.name, s.order_index, (e->>'actual_percent')::numeric from jsonb_array_elements(p_items) e join public.stages s on s.id = (e->>'stage_id')::uuid and s.project_id = p_project and s.is_physical;
  else
    select * into v_m from public.measurements where id = p_measurement and project_id = p_project for update;
    if not found then raise exception 'Medição não encontrada nesta obra.'; end if;
    v_old := public.measurement_snapshot(v_m.id);
    select count(*) into v_n from public.measurement_items where measurement_id = v_m.id and stage_id is not null;
    if jsonb_array_length(p_items) <> v_n or exists (select 1 from jsonb_array_elements(p_items) e where not exists (select 1 from public.measurement_items i where i.measurement_id = v_m.id and i.stage_id = (e->>'stage_id')::uuid)) then
      raise exception 'Os itens devem ser exatamente os da medição (etapas novas ou removidas depois não entram nem saem dela).'; end if;
    if p_reference_date <> v_m.reference_date then
      begin update public.measurements set reference_date = p_reference_date where id = v_m.id;
      exception when unique_violation then raise exception 'Já existe uma medição desta obra nesta data.'; end;
    end if;
    update public.measurement_items i set actual_percent = (e->>'actual_percent')::numeric from jsonb_array_elements(p_items) e where i.measurement_id = v_m.id and i.stage_id = (e->>'stage_id')::uuid;
    update public.measurements set notes = nullif(trim(p_notes), ''), updated_by = auth.uid(), updated_at = now() where id = v_m.id;
  end if;

  select round(avg(actual_percent), 4) into v_avg from public.measurement_items where measurement_id = v_m.id;      -- média aritmética = pesos iguais
  update public.measurements set progress_percent = v_avg where id = v_m.id;

  select id into v_latest from public.measurements where project_id = p_project order by reference_date desc limit 1;   -- mais recente DEPOIS da operação
  if v_latest = v_m.id or v_latest is distinct from v_old_latest then
    update public.stages s set actual_percent = i.actual_percent from public.measurement_items i
      where i.measurement_id = v_latest and i.stage_id = s.id and s.is_physical and s.actual_percent is distinct from i.actual_percent;
    v_synced_from := v_latest;
  end if;

  insert into public.measurement_audit (measurement_id, project_id, action, old_data, new_data)
    values (v_m.id, p_project, case when v_new then 'create' else 'update' end, v_old, public.measurement_snapshot(v_m.id));
  return jsonb_build_object('id', v_m.id, 'progress_percent', v_avg, 'is_latest', (v_latest = v_m.id), 'synced_from', v_synced_from);
end $$;
revoke all on function public.save_measurement(uuid, date, text, jsonb, uuid) from public, anon;
grant execute on function public.save_measurement(uuid, date, text, jsonb, uuid) to authenticated;

-- 5) LEITURA DO CLIENTE (por token; não toca em get_client_project). Token inválido => null. Sem observações, sem usuários, sem ids de obra. ---------
-- Retorno (objeto):  { "measurements": [ {id, reference_date, progress_percent, items:[{stage_name, stage_order, actual_percent}]} ... em ordem cronológica ],
--                      "physical_stage_ids": [ uuid das etapas físicas da obra do token ] }    <- o portal usa a lista para ocultar itens orçamentários do cronograma/avanço
create or replace function public.get_client_measurements(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pid uuid := public.project_id_for_token(p_token);
begin
  if pid is null then return null; end if;
  return jsonb_build_object(
    'measurements', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'reference_date', m.reference_date, 'progress_percent', m.progress_percent,
        'items', coalesce((select jsonb_agg(jsonb_build_object('stage_name', i.stage_name, 'stage_order', i.stage_order, 'actual_percent', i.actual_percent) order by i.stage_order)
                           from public.measurement_items i where i.measurement_id = m.id), '[]'::jsonb)) order by m.reference_date)
      from public.measurements m where m.project_id = pid), '[]'::jsonb),
    'physical_stage_ids', coalesce((select jsonb_agg(s.id order by s.order_index) from public.stages s where s.project_id = pid and s.is_physical), '[]'::jsonb));
end $$;
revoke all on function public.get_client_measurements(text) from public;
grant execute on function public.get_client_measurements(text) to anon, authenticated;

-- 6) service_role não executa o que não usa (save_measurement exige admin real; as auxiliares são internas). Mantém get_client_measurements.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function public.project_id_for_token(text) from service_role;
    revoke all on function public.measurement_snapshot(uuid) from service_role;
    revoke all on function public.save_measurement(uuid, date, text, jsonb, uuid) from service_role;
  end if;
end $$;

-- ROLLBACK (manual, se necessário; remove só o que esta migration criou. Etapas NÃO são revertidas: ver backup/medições):
--   drop function if exists public.get_client_measurements(text), public.save_measurement(uuid, date, text, jsonb, uuid), public.measurement_snapshot(uuid), public.project_id_for_token(text);
--   drop table if exists public.measurement_audit, public.measurement_items, public.measurements;
--   alter table public.stages drop column if exists is_physical;   -- só perde a classificação feita pelo administrador
