import type { Stage } from '../types'
import { cssVar, stageColor, stageState } from '../utils/stage'
import { fmtShort } from '../utils/format'
export function StageList({ stages, onSelect }: { stages: Stage[]; onSelect: (s: Stage) => void }) {
  return (
    <div className="card" style={{ padding: '4px 16px' }}>
      {stages.map(s => {
        const st = stageState(s)
        return (
          <button key={s.id} className="st" style={cssVar(stageColor[st])} onClick={() => onSelect(s)}>
            <span className={`dot ${st === 'ok' ? 'f' : ''}`}>{st === 'ok' ? '✓' : s.actualPercent ? '●' : '○'}</span>
            <span className="n">{s.order}. {s.name}<small>{fmtShort(s.plannedStart)} → {fmtShort(s.plannedEnd)}</small></span>
            <span className="pct">{s.actualPercent}%</span>
          </button>)
      })}
    </div>)
}
