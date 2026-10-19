import type { MeasurementPoint, Stage } from '../types'
// Todas as etapas têm o MESMO peso. Nenhum valor financeiro entra nestes cálculos.
const DAY = 86400000
// Etapa FÍSICA x item ORÇAMENTÁRIO (stages.is_physical): só etapas físicas entram em medições, média, curva planejada e avanço. Ausente => física.
export const isPhysicalStage = (s: { isPhysical?: boolean }) => s.isPhysical !== false
export const physicalOnly = <T extends { isPhysical?: boolean }>(l: T[]): T[] => l.filter(isPhysicalStage)
// versões para as linhas do banco (painel administrativo)
type RowLike = { id: string; name: string; order_index: number; actual_percent: number | string; is_physical?: boolean }
// Só envia is_physical quando o banco suporta (migration 005) e o valor mudou; etapa nova nasce true (padrão do banco).
export const physicalPatch = (supported: boolean, initial: { is_physical?: boolean } | undefined, physical: boolean): { is_physical?: boolean } =>
  supported && (initial ? physical !== (initial.is_physical ?? true) : physical === false) ? { is_physical: physical } : {}
export const isPhysicalRow = (s: { is_physical?: boolean }) => s.is_physical !== false
export const newMeasurementRows = (stages: RowLike[]) => stages.filter(isPhysicalRow).sort((a, b) => a.order_index - b.order_index).map(s => ({ key: s.id, stageId: s.id as string | null, name: s.name, order: s.order_index, locked: false }))
export const prefillValues = (stages: RowLike[], last?: { measurement_items?: { stage_id: string | null; actual_percent: number | string }[] }): Record<string, string> =>
  Object.fromEntries(stages.filter(isPhysicalRow).map(s => [s.id, String(last?.measurement_items?.find(i => i.stage_id === s.id)?.actual_percent ?? s.actual_percent)]))
export const round4 = (n: number) => Math.round(n * 1e4) / 1e4
export const average = (v: number[]) => (v.length ? round4(v.reduce((a, b) => a + b, 0) / v.length) : 0)
export const byDate = <T extends { date: string }>(l: T[]) => [...l].sort((a, b) => a.date.localeCompare(b.date))
export const diffPp = (a: number, b: number) => round4(a - b)
export const previousOf = <T extends { date: string }>(date: string, l: T[]): T | null => { const p = byDate(l.filter(m => m.date < date)); return p[p.length - 1] ?? null }

export type OverallProgress = { percent: number | null; date: string | null; basis: 'measurement' | 'stages' | 'none' }
// Visão Geral: última medição (por data); sem medições, média simples dos % atuais das etapas (rotulada como tal).
export function overallProgress(all: Pick<Stage, 'actualPercent' | 'isPhysical'>[], ms: MeasurementPoint[]): OverallProgress {
  const stages = physicalOnly(all)
  if (ms.length) { const s = byDate(ms), l = s[s.length - 1]; return { percent: l.progress, date: l.date, basis: 'measurement' } }
  if (stages.length) return { percent: average(stages.map(s => s.actualPercent)), date: null, basis: 'stages' }
  return { percent: null, date: null, basis: 'none' }
}

export type Pt = { t: number; p: number }
// Curva PLANEJADA: avanço esperado em cada data = média, entre as etapas, da fração do prazo de cada etapa já decorrida
// (linear entre início e fim planejados). Linear por trechos => os vértices em início/fim de cada etapa a representam exatamente.
export function plannedCurve(all: Pick<Stage, 'plannedStart' | 'plannedEnd' | 'isPhysical'>[]): Pt[] {
  const stages = physicalOnly(all)
  if (!stages.length) return []
  const span = stages.map(s => [Date.parse(s.plannedStart), Date.parse(s.plannedEnd) + DAY] as const)
  return [...new Set(span.flat())].sort((a, b) => a - b).map(t => ({ t, p: round4((span.reduce((a, [s, e]) => a + Math.min(1, Math.max(0, (t - s) / (e - s))), 0) / span.length) * 100) }))
}
export function plannedAt(c: Pt[], t: number): number {
  if (!c.length || t <= c[0].t) return 0
  if (t >= c[c.length - 1].t) return c[c.length - 1].p
  const i = c.findIndex(x => x.t >= t), a = c[i - 1], b = c[i]
  return round4(a.p + ((b.p - a.p) * (t - a.t)) / (b.t - a.t))
}
// Curva REALIZADA: exatamente um ponto por medição salva, em ordem cronológica (nunca pontos inventados).
export type ActualPt = Pt & { id: string; date: string }
export const actualPoints = (ms: MeasurementPoint[]): ActualPt[] => byDate(ms).map(m => ({ t: Date.parse(m.date), p: m.progress, id: m.id, date: m.date }))
export const pointLabel = (date: string, p: number) => `${date.split('-').reverse().join('/')} — ${p.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Prévia (somente exibição) da regra do banco: após criar/editar, as etapas são sincronizadas com a medição que ficou MAIS RECENTE
// quando (a) a medição salva passou a ser a mais recente, ou (b) a mais recente mudou por causa da operação.
export function syncPlan(existing: { id: string; date: string }[], selfId: string | null, newDate: string): { sync: boolean; sourceId: string | null; sourceDate: string | null } {
  const last = (l: { id: string; date: string }[]) => { const s = byDate(l); return s[s.length - 1] ?? null }
  const me = { id: selfId ?? '__new__', date: newDate }, before = last(existing), after = last([...existing.filter(m => m.id !== selfId), me])!
  const sync = after.id === me.id || after.id !== before?.id
  return { sync, sourceId: sync ? after.id : null, sourceDate: sync ? after.date : null }
}

// Validação dos percentuais digitados (0–100, todos preenchidos)
export function validatePercents(vals: string[]): string | null {
  for (const v of vals) { const n = v.trim() === '' ? NaN : Number(v.replace(',', '.')); if (!Number.isFinite(n)) return 'Preencha o percentual de todas as etapas (use 0 se não iniciada).'; if (n < 0 || n > 100) return 'Cada percentual deve estar entre 0 e 100.' }
  return null
}
