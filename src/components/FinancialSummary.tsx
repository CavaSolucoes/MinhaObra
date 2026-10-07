import type { Project } from '../types'
import { brl, pct } from '../utils/format'
export function FinancialSummary({ project }: { project: Project }) {
  const c = (project.spent / project.budget) * 100
  return (
    <div className="card"><div className="lab">Orçamento total</div>
      <div className="big" style={{ color: 'var(--tx)', fontSize: 34 }}>{brl(project.budget)}</div>
      <div className="kv" style={{ marginTop: 14 }}>
        <div><span className="lab">Realizado</span><b>{brl(project.spent)}</b></div>
        <div><span className="lab">Saldo</span><b style={{ color: 'var(--ok)' }}>{brl(project.budget - project.spent)}</b></div>
      </div>
      <div className="row" style={{ marginTop: 14 }}><span className="lab">% consumido</span><b style={{ color: 'var(--gold)' }}>{pct(c)}</b></div>
      <div className="bar"><i style={{ width: `${Math.min(100, c)}%` }} /></div>
    </div>)
}
