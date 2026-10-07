import type { Project } from '../types'
import { brl } from '../utils/format'
export function BudgetTrio({ project }: { project: Project }) {
  return (
    <div className="card g3">
      <div><div className="lab">Orçamento</div><div className="num">{brl(project.budget)}</div></div>
      <div><div className="lab">Realizado</div><div className="num">{brl(project.spent)}</div></div>
      <div><div className="lab">Saldo</div><div className="num" style={{ color: 'var(--ok)' }}>{brl(project.budget - project.spent)}</div></div>
    </div>)
}
