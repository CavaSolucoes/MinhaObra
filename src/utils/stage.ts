import type { CSSProperties } from 'react'
import type { Stage, StageState } from '../types'
export const stageColor: Record<StageState, string> = { ok: '#4cae7a', run: '#c9a24b', idle: '#6b6b72', bad: '#e0594f' }
export const cssVar = (c: string) => ({ '--c': c }) as CSSProperties
type Pct = Pick<Stage, 'actualPercent'>
type Sched = Pick<Stage, 'actualPercent' | 'plannedPercent'>
// STATUS DE EXECUÇÃO — depende somente do percentual executado (0 = não iniciado, 1–99 = em andamento, 100 = concluído).
// Nunca usa o status persistido no banco (que mistura progresso e prazo).
export const stageState = (s: Pct): StageState => (s.actualPercent >= 100 ? 'ok' : s.actualPercent > 0 ? 'run' : 'idle')
export const stageLabel = (s: Pct) => ({ ok: 'Concluído', run: 'Em andamento', idle: 'Não iniciado', bad: 'Atrasado' })[stageState(s)]
// SITUAÇÃO DE PRAZO — independente do status: atrasado quando o executado está abaixo do planejado e a etapa não terminou.
export const isLate = (s: Sched) => s.actualPercent < 100 && s.actualPercent < s.plannedPercent
export const situationLabel = (s: Sched) => (isLate(s) ? 'Atrasado' : 'No prazo')
