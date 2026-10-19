-- Testes locais (Postgres descartável com stub de auth/storage) das migrations 005 + 006. NUNCA rodar no Supabase real.
\set ON_ERROR_STOP on
create function public.t_assert(c boolean, msg text) returns void language plpgsql as $$ begin if c is not true then raise exception 'ASSERT FALHOU: %', msg; end if; raise notice 'PASS  %', msg; end $$;
create function public.t_err(q text, pat text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ~* pat then raise notice 'PASS  %  [%]', msg, left(sqlerrm, 70); return; end if;
    raise exception 'ASSERT FALHOU: % (erro inesperado: %)', msg, sqlerrm;
  end;
  raise exception 'ASSERT FALHOU: % (esperava erro e não houve)', msg;
end $$;
create function public.t_items(pid uuid, vals numeric[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('stage_id', id, 'actual_percent', vals[order_index::int]) order by order_index) from public.stages where project_id = pid and vals[order_index::int] is not null $$;
create function public.t_state(pid uuid) returns text language sql as $$
  select md5(coalesce((select string_agg(x::text, '|' order by x::text) from public.measurements x where x.project_id = pid), '')
          || coalesce((select string_agg(i::text, '|' order by i::text) from public.measurement_items i join public.measurements m on m.id = i.measurement_id where m.project_id = pid), '')
          || coalesce((select string_agg(a::text, '|' order by a::text) from public.measurement_audit a where a.project_id = pid), '')
          || coalesce((select string_agg(s::text, '|' order by s::text) from public.stages s where s.project_id = pid), '')) $$;
create function public.t_ph(pid uuid, vals numeric[]) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('stage_id', id, 'actual_percent', vals[order_index::int]) order by order_index), '[]'::jsonb) from public.stages where project_id = pid and is_physical and vals[order_index::int] is not null $$;
create function public.t_cur(pid uuid) returns text language sql as $$ select string_agg(actual_percent::text, ',' order by order_index) from public.stages where project_id = pid $$;
insert into auth.users(id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.cava_admins values ('aaaaaaaa-0000-0000-0000-000000000001') on conflict do nothing;
select id as pid from public.projects where name = 'Residência Parque das Dunas' \gset
insert into public.projects(id, name, client_name, location, start_date, planned_end_date) values ('99999999-0000-0000-0000-000000000009', 'Outra Obra', 'X', 'Y', '2026-01-01', '2026-12-31');
insert into public.stages(id, project_id, name, order_index, planned_start, planned_end) values ('99999999-0000-0000-0000-0000000000a1', '99999999-0000-0000-0000-000000000009', 'Única', 1, '2026-01-01', '2026-06-30');
insert into public.project_access(project_id, token_hash) values ('99999999-0000-0000-0000-000000000009', encode(digest('TOKEN-OUTRA', 'sha256'), 'hex'));
select count(*) as n_stages_before from public.stages where project_id = :'pid' \gset
select jsonb_agg(jsonb_build_object('id', id, 'a', actual_percent) order by order_index)::text as stages_before from public.stages where project_id = :'pid' \gset

\echo '=== ADMIN: criação, média aritmética e sincronização'
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.save_measurement(:'pid', '2026-08-01', 'nota interna A', public.t_items(:'pid', '{100,100,60,20,0,0,0}')) as r1 \gset
select public.t_assert((:'r1'::jsonb->>'progress_percent')::numeric = 40, 'média de 100,100,60,20,0,0,0 = 40 (7 etapas, peso igual)');
select public.t_assert((select actual_percent from public.stages where name = 'Estrutura') = 60 and (select actual_percent from public.stages where name = 'Alvenaria') = 20, '1ª medição (a mais recente) sincroniza stages.actual_percent');
select public.t_assert((select status from public.stages where name = 'Estrutura') = 'em_andamento', '006: 60% => em_andamento (não "atrasado" nem "concluido")');
select public.save_measurement(:'pid', '2026-09-12', null, public.t_items(:'pid', '{100,100,90,50,10,0,0}')) as r2 \gset
select public.t_assert((:'r2'::jsonb->>'progress_percent')::numeric = 50 and (:'r2'::jsonb->>'is_latest')::boolean, '2ª medição (mais recente): média 50');
select public.t_assert((select actual_percent from public.stages where name = 'Estrutura') = 90, 'estado atual passa para a medição mais recente (90)');
select public.save_measurement(:'pid', '2026-07-01', null, public.t_items(:'pid', '{100,50,0,0,0,0,0}')) as r3 \gset
select public.t_assert(round((:'r3'::jsonb->>'progress_percent')::numeric, 2) = 21.43 and not (:'r3'::jsonb->>'is_latest')::boolean, 'medição retroativa (jul): média 21,43 e NÃO é a mais recente');
select public.t_assert((select actual_percent from public.stages where name = 'Estrutura') = 90, 'medição retroativa NÃO altera o estado atual');
select public.t_assert((select array_agg(reference_date order by reference_date)::text from public.measurements where project_id = :'pid') = '{2026-07-01,2026-08-01,2026-09-12}', 'histórico em ordem cronológica');
select id as m_aug from public.measurements where reference_date = '2026-08-01' and project_id = :'pid' \gset
select id as m_sep from public.measurements where reference_date = '2026-09-12' and project_id = :'pid' \gset

\echo '=== EDIÇÃO: medição antiga não altera o estado atual nem as outras medições (snapshots)'
select jsonb_agg(i.actual_percent order by i.stage_order)::text as sep_before from public.measurement_items i where measurement_id = :'m_sep' \gset
select public.save_measurement(:'pid', '2026-08-01', 'nota editada', public.t_items(:'pid', '{100,100,70,30,0,0,0}'), :'m_aug') as r4 \gset
select public.t_assert(round((:'r4'::jsonb->>'progress_percent')::numeric, 4) = round(300.0/7, 4) and not (:'r4'::jsonb->>'is_latest')::boolean, 'edição da medição de agosto: nova média 42,8571, não é a mais recente');
select public.t_assert((select actual_percent from public.stages where name = 'Estrutura') = 90, 'editar medição ANTIGA não altera stages.actual_percent');
select public.t_assert((select jsonb_agg(i.actual_percent order by i.stage_order)::text from public.measurement_items i where measurement_id = :'m_sep') = :'sep_before', 'medição de setembro permanece idêntica');
select public.t_assert((select progress_percent from public.measurements where id = :'m_sep') = 50, 'média de setembro permanece 50');
select public.save_measurement(:'pid', '2026-09-12', 'ok', public.t_items(:'pid', '{100,100,95,55,10,0,0}'), :'m_sep') as r5 \gset
select public.t_assert((select actual_percent from public.stages where name = 'Estrutura') = 95, 'editar a medição MAIS RECENTE sincroniza o estado atual (95)');
select public.t_assert((select count(*) from public.measurement_audit where measurement_id = :'m_aug' and action = 'update') = 1 and (select old_data->>'notes' from public.measurement_audit where measurement_id = :'m_aug' and action = 'update') = 'nota interna A', 'auditoria: update com dados ANTES (nota interna A) e depois');
select public.t_assert((select count(*) from public.measurement_audit where action = 'create') = 3, 'auditoria: 3 criações');

\echo '=== ETAPAS NOVAS E EXCLUÍDAS'
reset role;
insert into public.stages(project_id, name, order_index, planned_start, planned_end) values (:'pid', 'Paisagismo', 8, '2026-10-02', '2026-12-15');
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_assert((select count(*) from public.measurement_items where measurement_id = :'m_aug') = 7 and (select progress_percent from public.measurements where id = :'m_aug') = round(300.0/7, 4), 'etapa criada depois NÃO entra nas medições antigas (7 itens, média inalterada)');
select public.save_measurement(:'pid', '2026-08-01', 'ainda editável', public.t_items(:'pid', '{100,100,70,30,0,0,0}'), :'m_aug') is not null as ok_edit_old \gset
select public.t_assert(:'ok_edit_old', 'medição antiga continua editável com os 7 itens originais');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-01', null, public.t_items(%L, '{1,1,1,1,1,1,1}'))$q$, :'pid', :'pid'), 'todas as etapas', 'nova medição com 7 itens quando há 8 etapas é recusada (não omite etapa)');
select public.save_measurement(:'pid', '2026-10-01', null, public.t_items(:'pid', '{100,100,100,60,30,10,0,0}')) as r6 \gset
select public.t_assert((:'r6'::jsonb->>'progress_percent')::numeric = 50 , 'nova medição com 8 etapas: média 400/8 = 50');
reset role;
select progress_percent as sep_avg from public.measurements where id = :'m_sep' \gset
delete from public.stages where name = 'Instalações';
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_assert((select count(*) from public.measurement_items where stage_name = 'Instalações' and stage_id is null) = 4, 'etapa excluída: itens históricos permanecem (stage_id nulo, nome preservado)');
select public.t_assert((select progress_percent from public.measurements where id = :'m_sep') = :sep_avg::numeric, 'média histórica de setembro NÃO muda com a exclusão da etapa');
select id as m_oct from public.measurements where reference_date = '2026-10-01' and project_id = :'pid' \gset
select public.save_measurement(:'pid', '2026-10-01', null, public.t_items(:'pid', '{10,10,10,10,99,10,10,10}'), :'m_oct') as r7 \gset
select public.t_assert((:'r7'::jsonb->>'progress_percent')::numeric = 12.5 and (select actual_percent from public.measurement_items where measurement_id = :'m_oct' and stage_name = 'Instalações') = 30, 'edição após exclusão: item da etapa removida permanece imutável (30) e entra na média: (7x10 + 30)/8 = 12,5');
select public.t_err(format($q$select public.save_measurement(%L, '2026-08-01', null, public.t_items(%L, '{1,1,1,1,1,1,1,1}'), %L)$q$, :'pid', :'pid', :'m_aug'), 'exatamente os da medição', 'etapa criada depois não pode ser incluída numa medição antiga');
\echo '=== VALIDAÇÕES'
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, '[]')$q$, :'pid'), 'Informe os percentuais', 'lista vazia');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, (select jsonb_agg(jsonb_build_object('stage_id', id, 'actual_percent', 101)) from public.stages where project_id = %L))$q$, :'pid', :'pid'), 'entre 0 e 100', 'percentual 101 recusado');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, (select jsonb_agg(jsonb_build_object('stage_id', id, 'actual_percent', -1)) from public.stages where project_id = %L))$q$, :'pid', :'pid'), 'entre 0 e 100', 'percentual negativo recusado');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, (select jsonb_agg(jsonb_build_object('stage_id', '99999999-0000-0000-0000-0000000000a1', 'actual_percent', 10)) from generate_series(1,7)))$q$, :'pid'), 'repetida', 'etapa repetida recusada');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, '[{"stage_id":"99999999-0000-0000-0000-0000000000a1","actual_percent":10},{"stage_id":"11111111-0000-0000-0000-000000000001","actual_percent":10}]')$q$, :'pid'), 'todas as etapas', 'etapas de OUTRA obra recusadas');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-01', null, public.t_items(%L, '{1,1,1,1,1,1,1,1}'))$q$, :'pid', :'pid'), 'Já existe', 'data duplicada recusada');
select public.t_err($q$select public.save_measurement('00000000-0000-0000-0000-000000000000', '2026-10-02', null, '[{"stage_id":"11111111-0000-0000-0000-000000000001","actual_percent":1}]')$q$, 'Obra não encontrada', 'obra inexistente');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, public.t_items(%L, '{1,1,1,1,1,1,1,1}'), '99999999-0000-0000-0000-0000000000a1')$q$, :'pid', :'pid'), 'Medição não encontrada', 'medição de outra obra/inexistente');

\echo '=== ATOMICIDADE: falha no último passo desfaz TUDO'
reset role;
create function public.t_boom() returns trigger language plpgsql as $$ begin if new.actual_percent = 77 then raise exception 'boom no sync'; end if; return new; end $$;
create trigger t_boom before update on public.stages for each row execute function public.t_boom();
select count(*) as mc, (select count(*) from public.measurement_items) as ic, (select count(*) from public.measurement_audit) as ac from public.measurements \gset
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-03', null, public.t_items(%L, '{100,100,100,77,30,10,0,0}'))$q$, :'pid', :'pid'), 'boom', 'falha durante a sincronização das etapas');
reset role;
select public.t_assert((select count(*) from public.measurements) = :mc and (select count(*) from public.measurement_items) = :ic and (select count(*) from public.measurement_audit) = :ac, 'nenhum registro parcial: medição, itens e auditoria intactos');
drop trigger t_boom on public.stages; drop function public.t_boom();

\echo '=== SEGURANÇA / RLS'
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err($q$insert into public.measurements(project_id, reference_date, progress_percent) values ('99999999-0000-0000-0000-000000000009', '2026-01-01', 10)$q$, 'permission denied|row-level security', 'ADMIN não grava direto em measurements (só via função)');
select public.t_err($q$update public.measurements set notes = 'x'$q$, 'permission denied|row-level security', 'ADMIN não altera direto');
select public.t_err($q$delete from public.measurement_items$q$, 'permission denied|row-level security', 'ADMIN não apaga direto itens');
select public.t_err($q$delete from public.measurement_audit$q$, 'permission denied|row-level security', 'auditoria não pode ser apagada pela API');
select public.t_assert((select count(*) from public.measurements) = 4 and (select count(*) from public.measurement_audit) >= 6, 'ADMIN lê medições e auditoria');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
select public.t_assert((select count(*) from public.measurements) = 0, 'usuário autenticado NÃO-admin não vê medições');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, public.t_items(%L, '{1,1,1,1,1,1,1,1}'))$q$, :'pid', :'pid'), 'forbidden', 'não-admin não salva medição');
reset role; set role anon;
select public.t_err($q$select count(*) from public.measurements$q$, 'permission denied', 'anon não lê a tabela');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', null, '[]')$q$, :'pid'), 'permission denied', 'anon não executa save_measurement');
select public.t_err($q$select public.project_id_for_token('8FJ29K')$q$, 'permission denied', 'helper de token não é chamável pela API');
\echo '=== CLIENTE POR TOKEN'
select public.get_client_measurements('8FJ29K') as cm \gset
select public.t_assert(jsonb_typeof(:'cm'::jsonb) = 'object' and jsonb_array_length(:'cm'::jsonb->'measurements') = 4 and (:'cm'::jsonb->'measurements'->0->>'reference_date') = '2026-07-01' and (:'cm'::jsonb->'measurements'->3->>'reference_date') = '2026-10-01', 'token válido: objeto { measurements, physical_stage_ids } com 4 medições em ordem cronológica');
select public.t_assert(:'cm' !~ 'notes|nota interna|created_by|updated_by|changed_by|project_id', 'cliente NÃO recebe observações, usuários nem ids de obra');
select public.t_assert((public.get_client_measurements('TOKEN-OUTRA')->'measurements') = '[]'::jsonb and (public.get_client_measurements('TOKEN-OUTRA')->'physical_stage_ids') = '["99999999-0000-0000-0000-0000000000a1"]'::jsonb, 'token de outra obra só vê as medições e as etapas físicas dela');
select public.t_assert(public.get_client_measurements('TOKEN-INVALIDO') is null, 'token inválido => null (nada revelado)');
reset role;
update public.project_access set active = false where project_id = :'pid';
set role anon; select public.t_assert(public.get_client_measurements('8FJ29K') is null, 'link desativado => null'); reset role;
\echo '=== SINCRONIZAÇÃO POR DATA: a medição que ficou mais recente (depois da operação) é a fonte'
reset role;
insert into public.projects(id, name, client_name, location, start_date, planned_end_date) values ('77777777-0000-0000-0000-000000000007', 'Sync Obra', 'X', 'Y', '2026-01-01', '2026-12-31');
insert into public.stages(id, project_id, name, order_index, planned_start, planned_end) values
  ('77777777-0000-0000-0000-0000000000b1', '77777777-0000-0000-0000-000000000007', 'S1', 1, '2026-01-01', '2026-04-30'),
  ('77777777-0000-0000-0000-0000000000b2', '77777777-0000-0000-0000-000000000007', 'S2', 2, '2026-01-01', '2026-04-30'),
  ('77777777-0000-0000-0000-0000000000b3', '77777777-0000-0000-0000-000000000007', 'S3', 3, '2026-01-01', '2026-04-30');
select '77777777-0000-0000-0000-000000000007'::uuid as sp \gset
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select (public.save_measurement(:'sp', '2026-10-10', 'M1', public.t_items(:'sp', '{10,20,30}'))->>'id')::uuid as m1 \gset
select public.save_measurement(:'sp', '2026-10-13', 'M2', public.t_items(:'sp', '{40,50,60}')) as q2 \gset
select (:'q2'::jsonb->>'id')::uuid as m2 \gset
select public.t_assert(public.t_cur(:'sp') = '40,50,60' and (:'q2'::jsonb->>'is_latest')::boolean, 'preparo: M1 (10/10) e M2 (13/10); M2 é a mais recente e as etapas estão em 40,50,60');
\echo '--- 1) criar medição ANTERIOR à mais recente: estado atual intacto (inclusive ajuste manual feito na aba Cronograma)'
reset role; update public.stages set actual_percent = 45 where project_id = :'sp' and name = 'S1';
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.save_measurement(:'sp', '2026-10-05', 'M0', public.t_items(:'sp', '{1,2,3}')) as q0 \gset
select (:'q0'::jsonb->>'id')::uuid as m0 \gset
select public.t_assert(public.t_cur(:'sp') = '45,50,60' and not (:'q0'::jsonb->>'is_latest')::boolean and (:'q0'::jsonb->>'synced_from') is null, '1) medição anterior criada: stages.actual_percent NÃO muda (45 manual preservado) e nada é sincronizado');
reset role; update public.stages set actual_percent = 40 where project_id = :'sp' and name = 'S1';
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
\echo '--- 2) editar a medição mais recente (mesma data): mantém a sincronização'
select public.save_measurement(:'sp', '2026-10-13', 'M2 ed', public.t_items(:'sp', '{41,51,61}'), :'m2') as q3 \gset
select public.t_assert(public.t_cur(:'sp') = '41,51,61' and (:'q3'::jsonb->>'is_latest')::boolean and (:'q3'::jsonb->>'synced_from')::uuid = :'m2', '2) editar a mais recente sincroniza as etapas com ela (41,51,61)');
\echo '--- 3) mover a mais recente (M2) para ANTES de M1: M1 passa a ser a fonte da sincronização'
select public.save_measurement(:'sp', '2026-10-09', 'M2 movida', public.t_items(:'sp', '{41,51,61}'), :'m2') as q4 \gset
select public.t_assert(public.t_cur(:'sp') = '10,20,30' and not (:'q4'::jsonb->>'is_latest')::boolean and (:'q4'::jsonb->>'synced_from')::uuid = :'m1', '3) M2 movida p/ 09/10: M1 (10/10) é a mais recente e as etapas voltam a 10,20,30');
select public.t_assert((select reference_date from public.measurements where id = :'m2') = '2026-10-09' and (select array_agg(actual_percent order by stage_order)::text from public.measurement_items where measurement_id = :'m2') = '{41,51,61}' and (select progress_percent from public.measurements where id = :'m2') = 51, '3) M2 preserva seus próprios itens e média (51) apesar da nova data');
select public.t_assert((select array_agg(actual_percent order by stage_order)::text from public.measurement_items where measurement_id = :'m1') = '{10,20,30}' and (select progress_percent from public.measurements where id = :'m1') = 20 and (select reference_date from public.measurements where id = :'m1') = '2026-10-10', '3) M1 permanece intacta (histórico preservado)');
select public.t_assert((select (old_data->>'reference_date') || '>' || (new_data->>'reference_date') from public.measurement_audit where measurement_id = :'m2' and action = 'update' order by id desc limit 1) = '2026-10-13>2026-10-09', '3) auditoria registra a mudança de data (13/10 → 09/10)');
\echo '--- 4) mover uma medição ANTIGA para depois de todas: ela vira a mais recente e sincroniza'
select public.save_measurement(:'sp', '2026-10-15', 'M0 movida', public.t_items(:'sp', '{1,2,3}'), :'m0') as q5 \gset
select public.t_assert(public.t_cur(:'sp') = '1,2,3' and (:'q5'::jsonb->>'is_latest')::boolean and (:'q5'::jsonb->>'synced_from')::uuid = :'m0' and (select progress_percent from public.measurements where id = :'m0') = 2, '4) M0 movida p/ 15/10 vira a mais recente e as etapas sincronizam com ela (1,2,3)');
select public.save_measurement(:'sp', '2026-10-01', 'M0 volta', public.t_items(:'sp', '{1,2,3}'), :'m0') as q6 \gset
select public.t_assert(public.t_cur(:'sp') = '10,20,30' and (:'q6'::jsonb->>'synced_from')::uuid = :'m1', '4b) M0 movida p/ 01/10 (antes de todas): a mais recente volta a ser M1 e as etapas voltam a 10,20,30');
select public.t_assert((select count(*) from public.measurements where project_id = :'sp') = 3 and (select count(*) from public.measurement_audit where project_id = :'sp') = 7, 'nenhuma medição criada/perdida; auditoria acumulou as 7 operações (3 criações + 4 edições)');

\echo '--- 5) qualquer falha reverte TUDO (medição, itens, data, auditoria e etapas)'
reset role;
create function public.t_boom() returns trigger language plpgsql as $$ begin if new.actual_percent = 77 then raise exception 'boom no sync'; end if; return new; end $$;
create trigger t_boom before update on public.stages for each row execute function public.t_boom();
select public.t_state(:'sp') as st \gset
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-14', 'x', public.t_items(%L, '{77,1,1}'))$q$, :'sp', :'sp'), 'boom', '5a) criar medição (vira a mais recente) com falha na sincronização');
reset role; select public.t_assert(public.t_state(:'sp') = :'st', '5a) estado idêntico: nenhuma medição, item, auditoria ou etapa alterados');
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-15', 'x', public.t_items(%L, '{77,20,30}'), %L)$q$, :'sp', :'sp', :'m1'), 'boom', '5b) editar M1 mudando a data (passa a ser a mais recente) com falha na sincronização');
reset role; select public.t_assert(public.t_state(:'sp') = :'st' and (select reference_date from public.measurements where id = :'m1') = '2026-10-10', '5b) a mudança de data de M1 foi desfeita (continua 10/10) e tudo está idêntico');
update public.measurement_items set actual_percent = 77 where measurement_id = :'m2' and stage_name = 'S2';          -- preparo: M2 guarda 77 em S2
select public.t_state(:'sp') as st2 \gset
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-09-01', 'x', public.t_items(%L, '{10,20,30}'), %L)$q$, :'sp', :'sp', :'m1'), 'boom', '5c) mover M1 para antes das demais: a nova mais recente (M2) falha ao sincronizar');
reset role; select public.t_assert(public.t_state(:'sp') = :'st2' and (select reference_date from public.measurements where id = :'m1') = '2026-10-10' and public.t_cur(:'sp') = '10,20,30', '5c) data de M1 e etapas permanecem como antes (rollback completo)');
create function public.t_boom_audit() returns trigger language plpgsql as $$ begin if new.new_data->>'notes' = 'boom-audit' then raise exception 'boom na auditoria'; end if; return new; end $$;
create trigger t_boom_audit before insert on public.measurement_audit for each row execute function public.t_boom_audit();
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-10', 'boom-audit', public.t_items(%L, '{11,21,31}'), %L)$q$, :'sp', :'sp', :'m1'), 'boom na auditoria', '5d) falha na gravação da auditoria (último passo), depois da sincronização das etapas');
reset role; select public.t_assert(public.t_state(:'sp') = :'st2' and public.t_cur(:'sp') = '10,20,30', '5d) etapas, itens, medição e auditoria revertidos por completo');
drop trigger t_boom on public.stages; drop trigger t_boom_audit on public.measurement_audit; drop function public.t_boom(), public.t_boom_audit();

\echo '=== PERMISSÕES FINAIS (privilégios padrão amplos do Supabase simulados em local_stub.sql)'
reset role;
select public.t_assert((select count(*) from pg_class c cross join lateral aclexplode(c.relacl) a where c.relname in ('measurements', 'measurement_items', 'measurement_audit') and a.grantee = 0) = 0, 'PUBLIC não tem NENHUM privilégio nas 3 tabelas');
select public.t_assert(not exists (select 1 from pg_class c cross join lateral aclexplode(c.relacl) a where c.relname in ('measurements', 'measurement_items', 'measurement_audit') and a.grantee = 'anon'::regrole), '1) anon: NENHUM privilégio nas 3 tabelas (nenhuma entrada na ACL)');
select public.t_assert((select string_agg(distinct a.privilege_type, ',') from pg_class c cross join lateral aclexplode(c.relacl) a where c.relname in ('measurements', 'measurement_items', 'measurement_audit') and a.grantee = 'authenticated'::regrole) = 'SELECT' and (select count(*) from pg_class c cross join lateral aclexplode(c.relacl) a where c.relname in ('measurements', 'measurement_items', 'measurement_audit') and a.grantee = 'authenticated'::regrole) = 3, '2) authenticated: SOMENTE SELECT nas 3 tabelas (sem INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN)');
select public.t_assert((select string_agg(distinct a.privilege_type, ',') from pg_class c cross join lateral aclexplode(c.relacl) a where c.relname in ('measurements', 'measurement_items', 'measurement_audit') and a.grantee = 'service_role'::regrole) = 'SELECT', 'service_role: SOMENTE SELECT (não grava direto; auditoria íntegra)');
select public.t_assert(not exists (select 1 from (values ('anon'), ('authenticated'), ('service_role')) r(rol), (values ('USAGE'), ('SELECT'), ('UPDATE')) p(x) where has_sequence_privilege(r.rol, 'public.measurement_audit_id_seq', p.x)), '4) sequência da auditoria sem privilégio para anon/authenticated/service_role (só o dono a usa, dentro da função)');
select public.t_assert((select string_agg(p.proname || ':' || has_function_privilege('anon', p.oid, 'EXECUTE') || has_function_privilege('authenticated', p.oid, 'EXECUTE') || has_function_privilege('service_role', p.oid, 'EXECUTE'), ' ' order by p.proname) from pg_proc p where p.proname in ('save_measurement', 'get_client_measurements', 'project_id_for_token', 'measurement_snapshot'))
  = 'get_client_measurements:truetruetrue measurement_snapshot:falsefalsefalse project_id_for_token:falsefalsefalse save_measurement:falsetruefalse', 'EXECUTE (anon/authenticated/service_role): get_client_measurements=sim/sim/sim; save_measurement=não/sim/não; auxiliares=não/não/não');
select public.t_assert((select count(*) from pg_proc p where p.proname in ('save_measurement', 'measurement_snapshot', 'get_client_measurements') and p.prosecdef and p.proconfig[1] = 'search_path=""') = 3 and (select p.proconfig[1] = 'search_path=extensions, public' and p.prosecdef from pg_proc p where p.proname = 'project_id_for_token'), 'search_path fixo em todas as SECURITY DEFINER (vazio nas 3 principais; extensions, public só onde há digest())');
\echo '--- comportamento por papel'
set role service_role;
select public.t_err($q$insert into public.measurement_audit(project_id, action, new_data) values ('99999999-0000-0000-0000-000000000009', 'create', '{}')$q$, 'permission denied', 'service_role não grava direto na auditoria');
select public.t_err($q$delete from public.measurements$q$, 'permission denied', 'service_role não apaga medições direto');
select public.t_assert((select count(*) from public.measurements) >= 1, 'service_role consegue LER (backup/diagnóstico)');
select public.t_err($q$select public.save_measurement('99999999-0000-0000-0000-000000000009', current_date, null, '[]')$q$, 'permission denied', 'service_role não executa save_measurement');
reset role; set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_assert((select count(*) from public.measurement_audit) >= 1, 'ADMIN autenticado lê a auditoria (SELECT direto + RLS admin_read)');
select public.t_err($q$insert into public.measurement_audit(project_id, action, new_data) values ('99999999-0000-0000-0000-000000000009', 'create', '{}')$q$, 'permission denied', 'ADMIN não forja auditoria pela API');
select public.t_err($q$truncate public.measurement_items$q$, 'permission denied', 'ADMIN não faz TRUNCATE pela API');
\echo '--- validações novas (data e observações)'
select public.t_err(format($q$select public.save_measurement(%L, (now() at time zone 'America/Fortaleza')::date + 2, null, public.t_items(%L, '{1,1,1}'))$q$, :'sp', :'sp'), 'futura', 'data futura recusada (evitaria travar a sincronização)');
select public.t_err(format($q$select public.save_measurement(%L, '1999-12-31', null, public.t_items(%L, '{1,1,1}'))$q$, :'sp', :'sp'), 'anterior a 01/01/2000', 'data anterior a 01/01/2000 recusada');
select public.t_err(format($q$select public.save_measurement(%L, '2026-10-02', repeat('x', 5001), public.t_items(%L, '{1,1,1}'))$q$, :'sp', :'sp'), '5000 caracteres', 'observações acima de 5000 caracteres recusadas');
reset role;
\echo '=== ETAPAS FÍSICAS x ITENS ORÇAMENTÁRIOS (is_physical)'
reset role;
select public.t_assert((select data_type = 'boolean' and is_nullable = 'NO' and column_default = 'true' from information_schema.columns where table_schema = 'public' and table_name = 'stages' and column_name = 'is_physical'), 'is_physical: boolean NOT NULL DEFAULT true');
select public.t_assert((select count(*) from public.stages where not is_physical) = 0 and (select count(*) from public.stages) >= 10, 'NENHUMA etapa existente foi classificada como não física pela migration (todas true)');
insert into public.projects(id, name, client_name, location, start_date, planned_end_date) values ('88888888-0000-0000-0000-000000000008', 'Fisico', 'X', 'Y', '2026-01-01', '2026-12-31');
insert into public.stages(project_id, name, order_index, planned_start, planned_end) values
  ('88888888-0000-0000-0000-000000000008', 'P1', 1, '2026-01-01', '2026-04-30'), ('88888888-0000-0000-0000-000000000008', 'P2', 2, '2026-02-01', '2026-05-31'),
  ('88888888-0000-0000-0000-000000000008', 'Lucro presumido', 3, '2026-01-01', '2026-12-31'), ('88888888-0000-0000-0000-000000000008', 'P3', 4, '2026-03-01', '2026-06-30');
insert into public.stage_financials(stage_id, budget_total, actual_total, budget_materials, actual_materials, budget_labor, actual_labor)
  select id, 1000 * order_index, 500 * order_index, 600 * order_index, 300 * order_index, 400 * order_index, 200 * order_index from public.stages where project_id = '88888888-0000-0000-0000-000000000008';
insert into public.project_access(project_id, token_hash) values ('88888888-0000-0000-0000-000000000008', encode(digest('TOKEN-PF', 'sha256'), 'hex'));
select '88888888-0000-0000-0000-000000000008'::uuid as pf \gset
select id as lp from public.stages where project_id = :'pf' and name = 'Lucro presumido' \gset
select id as p3 from public.stages where project_id = :'pf' and name = 'P3' \gset
select md5(string_agg(f::text, '|' order by f::text)) as fin_before, string_agg(s.name || ':' || s.order_index, ',' order by s.order_index) as names_before from public.stage_financials f join public.stages s on s.id = f.stage_id where s.project_id = :'pf' \gset
update public.stages set is_physical = false where id = :'lp';                      -- ação MANUAL do administrador (aqui simulada): "Lucro presumido" é item orçamentário
update public.stages set actual_percent = 15 where id = :'lp';                      -- valor próprio do item orçamentário
select public.t_assert((select count(*) from public.stages where project_id = :'pf' and not is_physical) = 1, 'preparo: só "Lucro presumido" foi marcado como não físico (marcação explícita)');
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.save_measurement(:'pf', '2026-09-01', 'nota interna PF', public.t_ph(:'pf', '{10,20,NULL,40}')) as f1 \gset
select (:'f1'::jsonb->>'id')::uuid as pm1 \gset
select public.t_assert(round((:'f1'::jsonb->>'progress_percent')::numeric, 4) = round(70.0 / 3, 4) and (select count(*) from public.measurement_items where measurement_id = :'pm1') = 3 and not exists (select 1 from public.measurement_items where measurement_id = :'pm1' and stage_name = 'Lucro presumido'), '4) média só das 3 etapas FÍSICAS: (10+20+40)/3 = 23,3333; o item orçamentário não entra na medição');
select public.t_assert(public.t_cur(:'pf') = '10,20,15,40', '4) sincronização atualiza só as físicas (10,20,40); "Lucro presumido" mantém o seu 15');
select public.t_err(format($q$select public.save_measurement(%L, '2026-09-02', null, public.t_items(%L, '{1,2,3,4}'))$q$, :'pf', :'pf'), 'não entram nas medições', '4) enviar item do "Lucro presumido" é recusado (não físico)');
select public.t_err(format($q$select public.save_measurement(%L, '2026-09-02', null, public.t_ph(%L, '{1,2,NULL,NULL}'))$q$, :'pf', :'pf'), 'todas as etapas físicas', '4) omitir uma etapa física continua recusado');
select public.save_measurement(:'pf', '2026-09-15', null, public.t_ph(:'pf', '{30,40,NULL,50}')) as f2 \gset
select (:'f2'::jsonb->>'id')::uuid as pm2 \gset
select public.t_assert(public.t_cur(:'pf') = '30,40,15,50' and (:'f2'::jsonb->>'progress_percent')::numeric = 40, '4) 2ª medição: físicas sincronizadas (30,40,50), média 40, "Lucro presumido" intacto (15)');
\echo '--- reclassificação DEPOIS de haver medições (histórico preservado)'
reset role; update public.stages set is_physical = false where id = :'p3';
select public.t_assert((select count(*) from public.measurement_items where measurement_id in (:'pm1', :'pm2')) = 6 and (select progress_percent from public.measurements where id = :'pm1') = round(70.0 / 3, 4) and (select progress_percent from public.measurements where id = :'pm2') = 40, '6) P3 passou a não-física: as medições já salvas mantêm 3 itens e a média original');
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-09-20', null, public.t_items(%L, '{1,2,NULL,4}'))$q$, :'pf', :'pf'), 'não entram nas medições', '6) nova medição não aceita mais o item da etapa reclassificada (P3)');
select public.save_measurement(:'pf', '2026-09-15', null, (select jsonb_agg(jsonb_build_object('stage_id', stage_id, 'actual_percent', actual_percent + 5) order by stage_order) from public.measurement_items where measurement_id = :'pm2'), :'pm2') as f2e \gset
select public.t_assert(public.t_cur(:'pf') = '35,45,15,50' and round((:'f2e'::jsonb->>'progress_percent')::numeric, 4) = 45, '6) editar a medição mais recente: P1/P2 sincronizam (35,45); P3 (agora não física) NÃO é tocada (50); a média do retrato continua com os 3 itens (45)');
select public.save_measurement(:'pf', '2026-09-20', null, public.t_ph(:'pf', '{60,70,NULL,NULL}')) as f3 \gset
select public.t_assert(public.t_cur(:'pf') = '60,70,15,50' and (:'f3'::jsonb->>'progress_percent')::numeric = 65 and (select count(*) from public.measurement_items where measurement_id = (:'f3'::jsonb->>'id')::uuid) = 2, '6) nova medição só com as 2 físicas atuais: média (60+70)/2 = 65; P3 e "Lucro presumido" intactos');
select public.save_measurement(:'pf', '2026-09-01', 'editada', (select jsonb_agg(jsonb_build_object('stage_id', stage_id, 'actual_percent', actual_percent) order by stage_order) from public.measurement_items where measurement_id = :'pm1'), :'pm1') is not null as ok_old_edit \gset
select public.t_assert(:'ok_old_edit' and public.t_cur(:'pf') = '60,70,15,50', '6) medição antiga continua editável com seus 3 itens originais e não altera o estado atual');
reset role; update public.stages set is_physical = true where id = :'p3'; set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err(format($q$select public.save_measurement(%L, '2026-09-25', null, public.t_ph(%L, '{70,80,NULL,NULL}'))$q$, :'pf', :'pf'), 'todas as etapas físicas', '6) P3 voltou a ser física: a próxima medição precisa dos 3 itens');
select public.save_measurement(:'pf', '2026-09-25', null, public.t_ph(:'pf', '{70,80,NULL,90}')) is not null as ok_back \gset
select public.t_assert(:'ok_back' and public.t_cur(:'pf') = '70,80,15,90', '6) com P3 física de novo: medição com 3 itens e sincronização das 3 físicas; "Lucro presumido" segue em 15');
\echo '--- obra SEM etapas físicas não admite medição'
reset role;
insert into public.projects(id, name, client_name, location, start_date, planned_end_date) values ('88888888-0000-0000-0000-000000000009', 'Sem fisica', 'X', 'Y', '2026-01-01', '2026-12-31'), ('88888888-0000-0000-0000-00000000000a', 'Sem etapas', 'X', 'Y', '2026-01-01', '2026-12-31');
insert into public.stages(id, project_id, name, order_index, planned_start, planned_end, is_physical) values ('88888888-0000-0000-0000-0000000000c1', '88888888-0000-0000-0000-000000000009', 'Só orçamento', 1, '2026-01-01', '2026-12-31', false);
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.t_err($q$select public.save_measurement('88888888-0000-0000-0000-000000000009', '2026-09-01', null, '[{"stage_id":"88888888-0000-0000-0000-0000000000c1","actual_percent":10}]')$q$, 'não tem etapas físicas', '9) obra só com itens orçamentários: medição recusada (mesmo enviando o item)');
select public.t_err($q$select public.save_measurement('88888888-0000-0000-0000-000000000009', '2026-09-01', null, '[]')$q$, 'não tem etapas físicas', '9) obra sem etapa física e lista vazia: mensagem clara');
select public.t_err($q$select public.save_measurement('88888888-0000-0000-0000-00000000000a', '2026-09-01', null, '[]')$q$, 'não tem etapas físicas', '9) obra sem nenhuma etapa: recusada');
reset role;
select public.t_assert((select count(*) from public.measurements where project_id in ('88888888-0000-0000-0000-000000000009', '88888888-0000-0000-0000-00000000000a')) = 0 and (select count(*) from public.measurement_audit where project_id in ('88888888-0000-0000-0000-000000000009', '88888888-0000-0000-0000-00000000000a')) = 0, '9) nenhuma medição nem auditoria criadas nessas obras');
\echo '--- orçamento/Financeiro e dados existentes preservados'
select public.t_assert((select md5(string_agg(f::text, '|' order by f::text)) from public.stage_financials f join public.stages s on s.id = f.stage_id where s.project_id = :'pf') = :'fin_before' and (select string_agg(name || ':' || order_index, ',' order by order_index) from public.stages where project_id = :'pf') = :'names_before', '5/6) registros financeiros idênticos (hash) e nenhuma etapa excluída ou renomeada após medições e reclassificações');
select public.t_assert((select count(*) from public.stage_financials f join public.stages s on s.id = f.stage_id where s.id = :'lp') = 1, '5) o item orçamentário "Lucro presumido" mantém o seu registro financeiro');
\echo '--- cliente: retorno e confidencialidade'
select public.get_client_measurements('TOKEN-PF') as cpf \gset
select public.t_assert(jsonb_typeof(:'cpf'::jsonb) = 'object' and (:'cpf'::jsonb->'physical_stage_ids') @> to_jsonb(:'p3'::text) and not ((:'cpf'::jsonb->'physical_stage_ids') @> to_jsonb(:'lp'::text)) and jsonb_array_length(:'cpf'::jsonb->'physical_stage_ids') = 3, '7) physical_stage_ids traz as 3 etapas físicas da obra do token e NÃO traz o "Lucro presumido"');
select public.t_assert(jsonb_array_length(:'cpf'::jsonb->'measurements') = 4 and :'cpf' !~ 'nota interna|editada|notes|created_by|updated_by|project_id' and not (:'cpf'::jsonb::text ~ 'Lucro'), '7) medições do cliente sem observações internas, sem usuários e sem o item orçamentário');
select public.t_assert(not (public.get_client_measurements('TOKEN-OUTRA')->'physical_stage_ids') @> to_jsonb(:'lp'::text) and not (public.get_client_measurements('TOKEN-OUTRA')->'physical_stage_ids') @> to_jsonb(:'p3'::text) and public.get_client_measurements('TOKEN-X-INVALIDO') is null, '7) token de outra obra não enxerga as etapas desta; token inválido => null');
\echo '--- permissões sobre a classificação'
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
with u as (update public.stages set is_physical = false where id = :'p3' returning 1) select count(*) as n_admin from u \gset
select public.t_assert(:n_admin = 1, '3) ADMIN consegue marcar/desmarcar "Etapa física" pelo painel (update em stages, RLS admin_all)');
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
with u as (update public.stages set is_physical = true where id = :'p3' returning 1) select count(*) as n_user from u \gset
select public.t_assert(:n_user = 0, '3) usuário autenticado NÃO-admin não altera a classificação (RLS)');
reset role; set role anon;
with u as (update public.stages set is_physical = true where id = :'p3' returning 1) select count(*) as n_anon from u \gset
select public.t_assert(:n_anon = 0, '3) anon não altera a classificação');
reset role;
update public.stages set is_physical = true where id = :'p3';
\echo '=== LIMITES DA DATA DE REFERÊNCIA: mínimo 01/01/2000 e máximo HOJE (fuso de Fortaleza), ambos inclusivos'
reset role;
insert into public.projects(id, name, client_name, location, start_date, planned_end_date) values ('66666666-0000-0000-0000-000000000006', 'Borda', 'X', 'Y', '2000-01-01', '2030-12-31');
insert into public.stages(project_id, name, order_index, planned_start, planned_end) values ('66666666-0000-0000-0000-000000000006', 'B1', 1, '2000-01-01', '2030-12-31');
select '66666666-0000-0000-0000-000000000006'::uuid as bp, (now() at time zone 'America/Fortaleza')::date as hoje_local \gset
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
select public.save_measurement(:'bp', '2000-01-01', null, public.t_items(:'bp', '{5}')) is not null as ok_min \gset
select public.t_assert(:'ok_min', 'mínimo INCLUSIVO: 01/01/2000 é aceita');
select public.save_measurement(:'bp', :'hoje_local', null, public.t_items(:'bp', '{50}')) as qh \gset
select public.t_assert((:'qh'::jsonb->>'is_latest')::boolean and (select actual_percent from public.stages where id = '66666666-0000-0000-0000-000000000006' or (project_id = :'bp')) = 50, 'máximo INCLUSIVO: a data de HOJE (Fortaleza) é aceita, vira a mais recente e sincroniza a etapa');
select public.t_err(format($q$select public.save_measurement(%L, %L::date + 1, null, public.t_items(%L, '{60}'))$q$, :'bp', :'hoje_local', :'bp'), 'não pode ser futura', 'amanhã (Fortaleza) é recusado — sem tolerância');
select public.t_err(format($q$select public.save_measurement(%L, '2099-01-01', null, public.t_items(%L, '{60}'))$q$, :'bp', :'bp'), 'não pode ser futura', 'data muito futura (ano digitado errado) recusada');
select public.t_err(format($q$select public.save_measurement(%L, '1999-12-31', null, public.t_items(%L, '{60}'))$q$, :'bp', :'bp'), 'anterior a 01/01/2000', 'um dia antes do mínimo é recusado');
select public.t_err(format($q$select public.save_measurement(%L, %L::date + 1, null, public.t_items(%L, '{60}'), %L)$q$, :'bp', :'hoje_local', :'bp', (:'qh'::jsonb->>'id')), 'não pode ser futura', 'EDITAR uma medição para data futura também é recusado');
select public.t_assert((select reference_date from public.measurements where id = (:'qh'::jsonb->>'id')::uuid) = :'hoje_local'::date and (select actual_percent from public.stages where project_id = :'bp') = 50, 'após as recusas nada mudou (data e etapa intactas)');
select public.save_measurement(:'bp', '2000-01-02', repeat('x', 5000), public.t_items(:'bp', '{7}')) is not null as ok_notes \gset
select public.t_assert(:'ok_notes', 'observações com exatamente 5.000 caracteres são aceitas');
select public.t_err(format($q$select public.save_measurement(%L, '2000-01-03', repeat('x', 5001), public.t_items(%L, '{7}'))$q$, :'bp', :'bp'), '5000 caracteres', 'observações com 5.001 caracteres são recusadas');
reset role;
\echo '=== LIMPEZA'
drop function public.t_assert(boolean, text), public.t_err(text, text, text), public.t_items(uuid, numeric[]), public.t_state(uuid), public.t_cur(uuid), public.t_ph(uuid, numeric[]);
