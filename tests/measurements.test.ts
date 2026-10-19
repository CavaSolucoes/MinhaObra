import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { average, overallProgress, plannedCurve, plannedAt, actualPoints, pointLabel, previousOf, diffPp, validatePercents, byDate } from '../src/utils/measure'
import { ScheduleChart } from '../src/components/ScheduleChart'
import { ProgressCard } from '../src/components/ProgressCard'
import { toMeasurementPoints, fromRpc } from '../src/services/mappers'
import { mockClientProject as demo } from '../src/data/mockData'
import type { MeasurementPoint } from '../src/types'

const mp = (date: string, progress: number, id = date): MeasurementPoint => ({ id, date, progress, items: [] })
const proj = { startDate: '2026-01-01', plannedEndDate: '2026-12-31' }
const stg = [{ plannedStart: '2026-01-01', plannedEndDate: '', plannedEnd: '2026-03-31' }, { plannedStart: '2026-04-01', plannedEnd: '2026-06-30' }] as any

test('média aritmética: 100, 50 e 0 => 50', () => assert.equal(average([100, 50, 0]), 50))
test('10 etapas: cada uma vale 10% do global', () => { assert.equal(average([100, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 10); assert.equal(average(Array(10).fill(100)), 100) })
test('média arredondada a 4 casas, igual ao banco (round(avg,4))', () => assert.equal(average([100, 100, 90, 50, 10, 0, 0]), 50))
test('média de 7 etapas com dízima = 42,8571', () => assert.equal(average([100, 100, 70, 30, 0, 0, 0]), 42.8571))
test('percentuais: vazio, texto, <0 e >100 são recusados; 0 e 100 aceitos', () => {
  assert.match(validatePercents(['10', ''])!, /Preencha/); assert.match(validatePercents(['x'])!, /Preencha/); assert.match(validatePercents(['-1'])!, /0 e 100/); assert.match(validatePercents(['100,5'])!, /0 e 100/); assert.equal(validatePercents(['0', '100', '33,3']), null)
})
test('medições em ordem cronológica, mesmo vindas desordenadas', () => {
  const pts = actualPoints([mp('2026-09-12', 50), mp('2026-07-01', 21), mp('2026-08-01', 40)])
  assert.deepEqual(pts.map(p => p.date), ['2026-07-01', '2026-08-01', '2026-09-12']); assert.ok(pts.every((p, i) => i === 0 || p.t > pts[i - 1].t))
  assert.deepEqual(byDate([mp('2026-02-01', 1), mp('2026-01-01', 2)]).map(m => m.date), ['2026-01-01', '2026-02-01'])
})
test('realizado: exatamente um ponto por medição (nenhum ponto inventado para meses sem medição)', () => {
  const ms = [mp('2026-01-31', 10), mp('2026-06-30', 60)]; assert.equal(actualPoints(ms).length, 2)
})
test('anterior e diferença em p.p.', () => { const l = [mp('2026-01-01', 10), mp('2026-02-01', 30)]; assert.equal(previousOf('2026-03-01', l)!.date, '2026-02-01'); assert.equal(previousOf('2026-01-01', l), null); assert.equal(diffPp(30, 10), 20); assert.equal(diffPp(10, 30.5), -20.5) })
test('rótulo do ponto: data e percentual', () => assert.equal(pointLabel('2026-09-12', 42.43), '12/09/2026 — 42,4%'))

test('planejado: avanço ESPERADO em cada data (não média das metas finais)', () => {
  const c = plannedCurve([{ plannedStart: '2026-01-01', plannedEnd: '2026-01-10' }, { plannedStart: '2026-01-11', plannedEnd: '2026-01-20' }])
  assert.equal(plannedAt(c, Date.parse('2025-12-01')), 0); assert.equal(plannedAt(c, Date.parse('2026-01-01')), 0)
  assert.equal(plannedAt(c, Date.parse('2026-01-06')), 25)    // etapa A pela metade, B não começou: (50% + 0%) / 2
  assert.equal(plannedAt(c, Date.parse('2026-01-11')), 50)    // A concluída, B não começou
  assert.equal(plannedAt(c, Date.parse('2026-01-16')), 75)    // A 100%, B 50%
  assert.equal(plannedAt(c, Date.parse('2026-02-01')), 100)
})
test('planejado: pesos IGUAIS por etapa, independentemente da duração (etapa longa não pesa mais)', () => {
  const c = plannedCurve([{ plannedStart: '2026-01-01', plannedEnd: '2026-01-01' }, { plannedStart: '2026-01-02', plannedEnd: '2026-04-11' }])
  assert.equal(plannedAt(c, Date.parse('2026-01-02')), 50)
})
test('planejado: sem etapas não há curva', () => assert.deepEqual(plannedCurve([]), []))

test('avanço geral: última medição por data; sem medições, média simples das etapas; nada => null', () => {
  assert.deepEqual(overallProgress([{ actualPercent: 0 }], [mp('2026-09-12', 50), mp('2026-07-01', 21)]), { percent: 50, date: '2026-09-12', basis: 'measurement' })
  assert.deepEqual(overallProgress([{ actualPercent: 100 }, { actualPercent: 50 }, { actualPercent: 0 }], []), { percent: 50, date: null, basis: 'stages' })
  assert.deepEqual(overallProgress([], []), { percent: null, date: null, basis: 'none' })
})

const count = (html: string, s: string) => html.split(s).length - 1
test('gráfico com 0 medições: curva planejada + mensagem clara, sem pontos de realizado', () => {
  const html = renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: stg, measurements: [] }))
  assert.ok(html.includes('Ainda não há medições registradas') && html.includes('stroke-dasharray') && count(html, 'data-point=') === 0)
})
test('gráfico com 1 medição: 1 ponto, sem linha de realizado, mensagem de "ao menos 2"', () => {
  const html = renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: stg, measurements: [mp('2026-02-15', 20)] }))
  assert.equal(count(html, 'data-point='), 1); assert.ok(html.includes('ao menos 2 medições')); assert.equal(count(html, 'stroke="#c9a24b"'), 0)
})
test('gráfico com 2 e com várias medições: linha de realizado + um ponto por medição, em ordem', () => {
  const two = renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: stg, measurements: [mp('2026-04-15', 40), mp('2026-02-15', 20)] }))
  assert.equal(count(two, 'data-point='), 2); assert.equal(count(two, 'stroke="#c9a24b"'), 1); assert.ok(two.indexOf('data-point="2026-02-15"') < two.indexOf('data-point="2026-04-15"'))
  const many = renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: stg, measurements: [mp('2026-01-31', 5), mp('2026-02-28', 12), mp('2026-03-31', 30), mp('2026-05-31', 55), mp('2026-06-30', 80)] }))
  assert.equal(count(many, 'data-point='), 5); assert.ok(many.includes('Toque ou passe o cursor')); assert.ok(many.includes('<title>31/03/2026 — 30%</title>'))
})
test('gráfico: sem etapas e sem medições mostra aviso (sem quebrar)', () => assert.ok(renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: [], measurements: [] })).includes('ainda não disponível')))
test('gráfico responsivo: viewBox + largura 100% (CSS global svg)', () => assert.ok(renderToStaticMarkup(h(ScheduleChart, { project: proj, stages: stg, measurements: [] })).includes('viewBox="0 0 340 200"')))

test('mapper: RPC do cliente => pontos ordenados, números e itens', () => {
  const pts = toMeasurementPoints([{ id: 'b', reference_date: '2026-09-12', progress_percent: '50.0000', items: [{ stage_name: 'Estrutura', stage_order: 3, actual_percent: '90' }] }, { id: 'a', reference_date: '2026-07-01', progress_percent: 21.4286, items: [] }])
  assert.deepEqual(pts.map(p => [p.date, p.progress]), [['2026-07-01', 21.4286], ['2026-09-12', 50]]); assert.deepEqual(pts[1].items, [{ stageName: 'Estrutura', order: 3, percent: 90 }])
  const r = fromRpc({ project: { id: 'p', name: 'n', location: 'l', address: null, main_image_url: null, start_date: '2026-01-01', planned_end_date: '2026-12-31', status: 'x' }, stages: [], media: [], documents: [] })
  assert.deepEqual(r.measurements, [])   // antes da migration 005 o portal segue funcionando, sem medições
})
test('Visão Geral: mostra última medição e rótulo; sem medição, rótulo de média; não usa 78% nem orçamento', () => {
  const a = renderToStaticMarkup(h(ProgressCard, { project: demo.project, progress: overallProgress(demo.stages, demo.measurements) }))
  assert.ok(a.includes('46,4%') && a.includes('Última medição: 30/09/2026') && !a.includes('78'))
  const b = renderToStaticMarkup(h(ProgressCard, { project: demo.project, progress: overallProgress(demo.stages, []) }))
  assert.ok(b.includes('Média das etapas (ainda sem medições)'))
})

import { syncPlan } from '../src/utils/measure'
test('prévia da sincronização (mesma regra do banco): os 4 cenários + criação anterior', () => {
  const ex = [{ id: 'M1', date: '2026-10-10' }, { id: 'M2', date: '2026-10-13' }]
  assert.deepEqual(syncPlan(ex, null, '2026-10-05'), { sync: false, sourceId: null, sourceDate: null })                       // 1. criar medição anterior à mais recente
  assert.deepEqual(syncPlan(ex, 'M2', '2026-10-13'), { sync: true, sourceId: 'M2', sourceDate: '2026-10-13' })               // 2. editar a mais recente
  assert.deepEqual(syncPlan(ex, 'M2', '2026-10-09'), { sync: true, sourceId: 'M1', sourceDate: '2026-10-10' })               // 3. mais recente movida para antes de outra => M1 vira a fonte
  assert.deepEqual(syncPlan(ex, 'M1', '2026-10-20'), { sync: true, sourceId: 'M1', sourceDate: '2026-10-20' })               // 4. antiga movida para depois de todas
  assert.deepEqual(syncPlan(ex, 'M1', '2026-10-11'), { sync: false, sourceId: null, sourceDate: null })                      // editar antiga mantendo-a antiga
  assert.deepEqual(syncPlan([], null, '2026-10-01'), { sync: true, sourceId: '__new__', sourceDate: '2026-10-01' })          // primeira medição
})
