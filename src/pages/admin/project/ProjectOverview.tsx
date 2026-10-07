import { useState } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { updateProject } from '../../../services/adminApi'
import { ProjectForm } from '../../../components/admin/ProjectForm'
import { useAct } from '../../../components/admin/ui'
import { brl } from '../../../utils/format'
export default function ProjectOverview() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct(), [k, setK] = useState(0)
  const budget = data.fins.reduce((a, f) => a + Number(f.budget_total), 0), spent = data.fins.reduce((a, f) => a + Number(f.actual_total), 0)
  return (<>
    <div className="card g3"><div><div className="lab">Orçado</div><div className="num">{brl(budget)}</div></div><div><div className="lab">Realizado</div><div className="num">{brl(spent)}</div></div><div><div className="lab">Etapas</div><div className="num">{data.stages.length}</div></div></div>
    <p style={{ color: 'var(--mu)', fontSize: 13, margin: '0 0 14px' }}>Orçado e realizado são a soma das etapas (aba Financeiro). O cadastro da obra não tem campo de orçamento total.</p>
    <ProjectForm key={k} initial={data.project} busy={busy} onCancel={() => setK(k + 1)} onSubmit={i => act(async () => { await updateProject(data.project.id, i); await reload() }, 'Obra atualizada')} />{node}
  </>)
}
