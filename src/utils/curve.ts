import type { Project, ScheduleCurve, Stage, StageFinancial } from '../types'
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DAY = 86400000
// Peso de cada etapa = orcamento da etapa / orcamento total (igual se o total for 0).
export function weights(stages: Stage[], fins: StageFinancial[]): number[] {
  const b = stages.map(s => fins.find(f => f.stageId === s.id)?.budgetTotal ?? 0), t = b.reduce((a, c) => a + c, 0)
  return b.map(v => (t > 0 ? v / t : 1 / stages.length))
}
export const weightedProgress = (stages: Stage[], fins: StageFinancial[], pick: (s: Stage) => number) => {
  const w = weights(stages, fins); return stages.reduce((a, s, i) => a + w[i] * pick(s), 0)
}
// Planejado: acumulado por mes a partir das datas das etapas (linear dentro de cada etapa).
// Realizado: so existe o ponto atual (sem historico de medicoes no banco) — nenhum mes e inventado.
export function buildCurve(p: Pick<Project, 'startDate' | 'plannedEndDate'>, stages: Stage[], fins: StageFinancial[], today = new Date()): ScheduleCurve {
  const out: ScheduleCurve = { months: [], planned: [], actual: [] }
  if (!stages.length) return out
  const a = new Date(p.startDate), b = new Date(p.plannedEndDate), w = weights(stages, fins)
  const now = today.getUTCFullYear() * 12 + today.getUTCMonth(), cur = weightedProgress(stages, fins, s => s.actualPercent)
  let y = a.getUTCFullYear(), m = a.getUTCMonth(); const endKey = b.getUTCFullYear() * 12 + b.getUTCMonth()
  while (y * 12 + m <= endKey) {
    const t = Date.UTC(y, m + 1, 1)
    const pl = stages.reduce((acc, s, i) => { const ps = Date.parse(s.plannedStart), pe = Date.parse(s.plannedEnd) + DAY; return acc + w[i] * Math.min(1, Math.max(0, (t - ps) / (pe - ps))) }, 0) * 100
    out.months.push(MONTHS[m]); out.planned.push(Math.round(pl * 10) / 10)
    out.actual.push(y * 12 + m === now ? Math.round(cur * 10) / 10 : null)
    if (++m > 11) { m = 0; y++ }
  }
  return out
}
