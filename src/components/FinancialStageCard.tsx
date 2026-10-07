import { Link } from 'react-router-dom'
import type { Stage, StageFinancial } from '../types'
import { brl } from '../utils/format'
import { cssVar } from '../utils/stage'
export function FinancialStageCard({ stage, fin, to }: { stage: Stage; fin: StageFinancial; to: string }) {
  const over = fin.actualTotal > fin.budgetTotal
  return (
    <Link to={to} className="card" style={{ width: '100%', display: 'block', color: 'inherit', textDecoration: 'none', ...cssVar(over ? '#e0594f' : '#4cae7a') }}>
      <div className="row"><b>{stage.name}</b><span className="badge">{over ? 'Acima' : 'Abaixo'}</span></div>
      <div className="row" style={{ marginTop: 8, fontSize: 14, color: 'var(--mu)' }}><span>Orçado: {brl(fin.budgetTotal)}</span><span style={{ color: 'var(--tx)' }}>Realizado: {brl(fin.actualTotal)}</span></div>
      <div className="bar"><i style={{ width: `${Math.min(100, (fin.actualTotal / fin.budgetTotal) * 100)}%`, background: 'var(--c)' }} /></div>
    </Link>)
}
