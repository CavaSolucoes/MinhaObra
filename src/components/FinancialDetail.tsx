import type { Stage, StageFinancial } from '../types'
import { brl, pct } from '../utils/format'
import { cssVar } from '../utils/stage'
const BAD = '#e0594f', OK = '#4cae7a'
function CostCard({ label, budget, actual }: { label: string; budget: number; actual: number }) {
  return (
    <div className="card" style={cssVar(actual > budget ? BAD : OK)}><div className="lab">{label}</div>
      <div className="kv" style={{ marginTop: 10 }}><div><span className="lab">Orçado</span><b>{brl(budget)}</b></div><div><span className="lab">Realizado</span><b>{brl(actual)}</b></div></div>
      <div className="pct" style={{ marginTop: 10, fontSize: 20 }}>{budget > 0 ? `${Math.round((actual / budget) * 100)}%` : '—'}</div>
    </div>)
}
export function FinancialDetail({ stage, fin }: { stage: Stage; fin: StageFinancial }) {
  const d = fin.actualTotal - fin.budgetTotal, sign = d > 0 ? '+' : '−'
  return (<>
    <h2>{stage.name.toUpperCase()}</h2>
    <div className="card" style={cssVar(d > 0 ? BAD : OK)}>
      <div className="kv"><div><span className="lab">Orçado</span><b>{brl(fin.budgetTotal)}</b></div><div><span className="lab">Realizado</span><b>{brl(fin.actualTotal)}</b></div></div>
      <div style={{ marginTop: 14 }}><span className="lab">Desvio</span><div className="num pct">{sign}{brl(Math.abs(d))} · {sign}{fin.budgetTotal > 0 ? pct((Math.abs(d) / fin.budgetTotal) * 100) : '—'}</div></div>
    </div>
    <CostCard label="Materiais" budget={fin.budgetMaterials} actual={fin.actualMaterials} />
    <CostCard label="Mão de obra" budget={fin.budgetLabor} actual={fin.actualLabor} />
  </>)
}
