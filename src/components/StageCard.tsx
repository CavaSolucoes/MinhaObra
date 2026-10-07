import type { Stage } from '../types'
import { cssVar, stageColor, stageLabel, stageState } from '../utils/stage'
import { fmtShort } from '../utils/format'
export function StageCard({ stage: s, onSelect }: { stage: Stage; onSelect: (s: Stage) => void }) {
  const c = stageColor[stageState(s)]
  return (
    <button className="card" style={{ width: '100%', display: 'block', borderLeft: '3px solid var(--c)', ...cssVar(c) }} onClick={() => onSelect(s)}>
      <div className="row"><b>{s.order}. {s.name}</b><span className="badge">{stageLabel(s)}</span></div>
      <div style={{ color: 'var(--mu)', fontSize: 14, marginTop: 4 }}>{fmtShort(s.plannedStart)} → {fmtShort(s.plannedEnd)}</div>
      <div className="row" style={{ marginTop: 6 }}><span>{s.actualPercent === 0 ? 'Não iniciado' : s.actualPercent === 100 ? '100% concluído' : `${s.actualPercent}% executado`}</span></div>
      <div className="bar"><i style={{ width: `${s.actualPercent}%`, background: 'var(--c)' }} /></div>
    </button>)
}
