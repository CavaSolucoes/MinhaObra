import type { CSSProperties } from 'react'
import type { Stage, StageState } from '../types'
export const stageColor: Record<StageState, string> = { ok: '#4cae7a', run: '#c9a24b', idle: '#6b6b72', bad: '#e0594f' }
export const cssVar = (c: string) => ({ '--c': c }) as CSSProperties
export const DB: Record<string, StageState> = { concluido: 'ok', nao_iniciado: 'idle', atrasado: 'bad', em_andamento: 'run' }
// Usa o status calculado pelo banco quando existe; senao deriva dos percentuais (mock)
export const stageState = (s: Stage): StageState =>
  (s.status && DB[s.status]) ||
  s.actualPercent >= 100 ? 'ok' : s.actualPercent === 0 ? 'idle' : s.actualPercent < s.plannedPercent ? 'bad' : 'run'
export const stageLabel = (s: Stage) => ({ ok: 'Concluído', idle: 'Não iniciado', bad: 'Atrasado', run: 'Em andamento' })[stageState(s)]
export const statusState = DB
export const statusLabel = (s: string) => ({ concluido: 'Concluído', nao_iniciado: 'Não iniciado', atrasado: 'Atrasado', em_andamento: 'Em andamento' })[s] ?? s
