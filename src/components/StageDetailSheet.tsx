import type { Stage } from '../types'
import { cssVar, isLate, situationLabel, stageColor, stageLabel, stageState } from '../utils/stage'
import { fmtDate } from '../utils/format'
export function StageDetailSheet({ stage: s, onClose }: { stage: Stage; onClose: () => void }) {
  return (
    <div className="sheet" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cssVar(stageColor[stageState(s)])}>
        <div className="row"><h2 style={{ margin: 0 }}>{s.order}. {s.name.toUpperCase()}</h2><button className="back" onClick={onClose}>Fechar</button></div>
        <div className="kv" style={{ marginTop: 12 }}>
          <div><span className="lab">Status</span><b>{stageLabel(s)}</b></div>
          <div><span className="lab">Situação</span><b style={{ color: isLate(s) ? stageColor.bad : 'var(--tx)' }}>{situationLabel(s)}</b></div>
          <div style={{ gridColumn: '1/3' }}><span className="lab">Período</span><b>{fmtDate(s.plannedStart)} → {fmtDate(s.plannedEnd)}</b></div>
          <div><span className="lab">Planejado</span><b>{s.plannedPercent}%</b></div>
          <div><span className="lab">Realizado</span><b>{s.actualPercent}%</b></div>
        </div>
      </div>
    </div>)
}
