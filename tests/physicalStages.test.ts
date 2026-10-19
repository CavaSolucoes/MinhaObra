import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Outlet, Route, Routes } from 'react-router-dom'
import { isPhysicalStage, physicalOnly, overallProgress, plannedCurve, newMeasurementRows, prefillValues, physicalPatch } from '../src/utils/measure'
import { ScheduleChart } from '../src/components/ScheduleChart'
import { parseMeasurementsPayload, fromRpc, toStage } from '../src/services/mappers'
import { mockClientProject as demo } from '../src/data/mockData'
import Overview from '../src/pages/client/Overview'
import Schedule from '../src/pages/client/Schedule'
import Financial from '../src/pages/client/Financial'
import { StageForm } from '../src/pages/admin/project/ProjectSchedule'
import type { ClientProject, Stage } from '../src/types'
import type { StageRow } from '../src/types/db'

const lucro: Stage = { id: 's-lucro', projectId: 'p1', name: 'Lucro presumido', order: 8, plannedStart: '2026-01-01', plannedEnd: '2026-12-31', plannedPercent: 0, actualPercent: 0, isPhysical: false }
const ctx: ClientProject = { ...demo, stages: [...demo.stages, lucro], financials: [...demo.financials, { stageId: 's-lucro', budgetTotal: 90000, actualTotal: 0, budgetMaterials: 0, actualMaterials: 0, budgetLabor: 0, actualLabor: 0 }], measurements: [] }
const page = (el: ReturnType<typeof h>, c: ClientProject) => renderToStaticMarkup(h(StaticRouter, { location: '/obra/T' }, h(Routes, null, h(Route, { path: '/obra/:token', element: h(Outlet, { context: c }) }, h(Route, { index: true, element: el })))))

test('etapa sem o campo isPhysical (portal antigo / antes da migration) conta como física', () => {
  assert.equal(isPhysicalStage({}), true); assert.equal(isPhysicalStage({ isPhysical: true }), true); assert.equal(isPhysicalStage({ isPhysical: false }), false)
  assert.deepEqual(physicalOnly([{ isPhysical: false, n: 1 }, { n: 2 }, { isPhysical: true, n: 3 }]).map(x => x.n), [2, 3])
})
test('avanço sem medições: média só das etapas FÍSICAS (item orçamentário não dilui)', () => {
  assert.equal(overallProgress([{ actualPercent: 100, isPhysical: true }, { actualPercent: 0, isPhysical: false }], []).percent, 100)
  assert.equal(overallProgress(demo.stages, []).percent, 46)                                 // 322/7
  assert.equal(overallProgress(ctx.stages, []).percent, 46)                                  // com "Lucro presumido" (0%): continua 46, não 40,25
  assert.deepEqual(overallProgress([{ actualPercent: 0, isPhysical: false }], []), { percent: null, date: null, basis: 'none' })
})
test('curva planejada ignora itens orçamentários (mesmo com datas longas)', () => {
  assert.deepEqual(plannedCurve(ctx.stages), plannedCurve(demo.stages)); assert.notDeepEqual(plannedCurve([...demo.stages, { ...lucro, isPhysical: true }]), plannedCurve(demo.stages))
})
test('gráfico: o item orçamentário não altera a curva planejada exibida', () => {
  const a = renderToStaticMarkup(h(ScheduleChart, { project: demo.project, stages: demo.stages, measurements: [] })), b = renderToStaticMarkup(h(ScheduleChart, { project: demo.project, stages: ctx.stages, measurements: [] }))
  assert.equal(a, b)
})
test('retorno do cliente: formato novo (objeto), formato antigo (lista), nulo e inválido', () => {
  assert.deepEqual(parseMeasurementsPayload({ measurements: [], physical_stage_ids: ['a', 'b'] }), { measurements: [], physicalIds: ['a', 'b'] })
  assert.deepEqual(parseMeasurementsPayload([{ id: 'm' }]), { measurements: [{ id: 'm' }], physicalIds: null })
  assert.deepEqual(parseMeasurementsPayload(null), { measurements: [], physicalIds: null }); assert.deepEqual(parseMeasurementsPayload('x'), { measurements: [], physicalIds: null })
  assert.deepEqual(parseMeasurementsPayload({ measurements: 5 }), { measurements: [], physicalIds: null })
})
test('mapper: physical_stage_ids define isPhysical; sem a lista, todas físicas; is_physical do banco (painel)', () => {
  const payload = { project: { id: 'p', name: 'n', location: 'l', address: null, main_image_url: null, start_date: '2026-01-01', planned_end_date: '2026-12-31', status: 'x' },
    stages: ['a', 'b', 'c'].map((id, i) => ({ id, project_id: 'p', name: id.toUpperCase(), order_index: i + 1, planned_start: '2026-01-01', planned_end: '2026-02-01', planned_percent: 0, actual_percent: 0, status: 'nao_iniciado', financial: null })), media: [], documents: [] }
  const r = fromRpc(payload, { measurements: [], physicalIds: ['a', 'c'] })
  assert.deepEqual(r.stages.map(s => [s.id, s.isPhysical]), [['a', true], ['b', false], ['c', true]])
  assert.ok(fromRpc(payload).stages.every(s => s.isPhysical === true)); assert.ok(fromRpc(payload, [{ id: 'x', reference_date: '2026-01-01', progress_percent: 1, items: [] }]).stages.every(s => s.isPhysical))
  assert.equal(toStage({ ...(payload.stages[0] as any), is_physical: false }).isPhysical, false); assert.equal(toStage(payload.stages[0] as any).isPhysical, true)
})
test('portal: item orçamentário some do cronograma e da lista de etapas, mas permanece no Financeiro', () => {
  const ov = page(h(Overview), ctx), sc = page(h(Schedule), ctx), fin = page(h(Financial), ctx)
  assert.ok(!ov.includes('Lucro presumido') && !sc.includes('Lucro presumido'))
  assert.ok(ov.includes('Fundação') && sc.includes('Fundação'))
  assert.ok(fin.includes('Lucro presumido') && fin.includes('Fundação'))
  assert.ok(ov.includes('46,0%'), 'avanço exibido ao cliente = média das etapas físicas')
})
const row = (o: Partial<StageRow> = {}): StageRow => ({ id: 's1', project_id: 'p', name: 'Etapa', order_index: 1, planned_start: '2026-01-01', planned_end: '2026-02-01', planned_percent: 0, actual_percent: 0, status: 'nao_iniciado', ...o })
test('painel: campo "Etapa física" (marcado por padrão, desmarcado para item orçamentário, oculto antes da migration)', () => {
  const nu = renderToStaticMarkup(h(StageForm, { busy: false, supported: true, onSave: () => {}, onCancel: () => {} }))
  assert.ok(nu.includes('Etapa física') && nu.includes('checked=""') && nu.includes('Financeiro') && nu.includes('Medições já salvas não mudam'))
  const off = renderToStaticMarkup(h(StageForm, { initial: row({ is_physical: false }), busy: false, supported: true, onSave: () => {}, onCancel: () => {} }))
  assert.ok(off.includes('Etapa física') && !off.includes('checked=""'))
  const old = renderToStaticMarkup(h(StageForm, { initial: row(), busy: false, supported: false, onSave: () => {}, onCancel: () => {} }))
  assert.ok(!old.includes('Etapa física'))
})
test('painel: is_physical só é enviado quando suportado e alterado (nunca classifica sozinho)', () => {
  assert.deepEqual(physicalPatch(false, row(), false), {})                                   // antes da migration: nada é enviado
  assert.deepEqual(physicalPatch(true, undefined, true), {})                                 // etapa nova marcada: usa o padrão do banco
  assert.deepEqual(physicalPatch(true, undefined, false), { is_physical: false })
  assert.deepEqual(physicalPatch(true, row({ is_physical: true }), true), {})                // sem mudança
  assert.deepEqual(physicalPatch(true, row({ is_physical: true }), false), { is_physical: false })
  assert.deepEqual(physicalPatch(true, row({ is_physical: false }), true), { is_physical: true })
})
test('painel: medição lista só etapas físicas, em ordem; pré-preenche pela última medição; obra sem físicas = lista vazia', () => {
  const st = [row({ id: 'a', order_index: 2, actual_percent: 20 }), row({ id: 'lp', name: 'Lucro presumido', order_index: 3, actual_percent: 15, is_physical: false }), row({ id: 'b', order_index: 1, actual_percent: 10 })]
  assert.deepEqual(newMeasurementRows(st).map(r => r.stageId), ['b', 'a'])
  assert.deepEqual(prefillValues(st, undefined), { a: '20', b: '10' })
  assert.deepEqual(prefillValues(st, { measurement_items: [{ stage_id: 'a', actual_percent: 55 }, { stage_id: 'lp', actual_percent: 99 }] }), { a: '55', b: '10' })
  assert.deepEqual(newMeasurementRows([row({ is_physical: false })]), []); assert.deepEqual(newMeasurementRows([]), [])
})
