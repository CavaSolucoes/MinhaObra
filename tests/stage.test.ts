import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'
import { stageState, stageLabel, isLate, situationLabel } from '../src/utils/stage'
import { StageCard } from '../src/components/StageCard'
import { StageDetailSheet } from '../src/components/StageDetailSheet'
import type { Stage } from '../src/types'
const st = (actualPercent: number, plannedPercent: number, status?: string): Stage => ({ id: 's', projectId: 'p', name: 'Estrutura', order: 3, plannedStart: '2026-03-01', plannedEnd: '2026-04-30', plannedPercent, actualPercent, status })

test('status de execução: 0 / 1–99 / 100', () => {
  for (const [a, label] of [[0, 'Não iniciado'], [1, 'Em andamento'], [33, 'Em andamento'], [60, 'Em andamento'], [90, 'Em andamento'], [99, 'Em andamento'], [100, 'Concluído']] as const) assert.equal(stageLabel(st(a, 100)), label, `${a}%`)
})
test('REGRESSÃO: o status persistido no banco (inclusive "concluido"/"atrasado") não muda o status exibido', () => {
  for (const dbStatus of ['concluido', 'atrasado', 'nao_iniciado', 'em_andamento', undefined]) { assert.equal(stageLabel(st(33, 100, dbStatus)), 'Em andamento'); assert.equal(stageLabel(st(0, 0, dbStatus)), 'Não iniciado'); assert.equal(stageState(st(100, 100, dbStatus)), 'ok') }
})
test('situação de prazo é independente do status', () => {
  assert.equal(isLate(st(33, 100)), true); assert.equal(situationLabel(st(33, 100)), 'Atrasado')
  assert.equal(situationLabel(st(60, 40)), 'No prazo'); assert.equal(situationLabel(st(100, 100)), 'No prazo'); assert.equal(situationLabel(st(0, 0)), 'No prazo')
  assert.equal(stageLabel(st(33, 100)), 'Em andamento') // atrasada E em andamento
})
test('componentes: card e detalhe mostram status e situação separados', () => {
  const card = renderToStaticMarkup(h(StageCard, { stage: st(33, 100, 'concluido'), onSelect: () => {} }))
  assert.ok(card.includes('Em andamento') && card.includes('Atrasado') && !card.includes('Concluído'))
  const sheet = renderToStaticMarkup(h(StageDetailSheet, { stage: st(90, 100, 'concluido'), onClose: () => {} }))
  assert.ok(sheet.includes('Status') && sheet.includes('Em andamento') && sheet.includes('Situação') && sheet.includes('Atrasado') && !sheet.includes('Concluído'))
  assert.ok(renderToStaticMarkup(h(StageCard, { stage: st(100, 100), onSelect: () => {} })).includes('Concluído'))
})
