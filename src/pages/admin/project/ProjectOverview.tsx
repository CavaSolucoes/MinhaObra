import { useState } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { useLocation } from 'react-router-dom'
import { setMainImage, updateProject } from '../../../services/adminApi'
import { ProjectForm } from '../../../components/admin/ProjectForm'
import { useAct } from '../../../components/admin/ui'
import { brl } from '../../../utils/format'
import { isPhysicalRow } from '../../../utils/measure'
export default function ProjectOverview() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct(), [k, setK] = useState(0), [warn, setWarn] = useState<string | null>((useLocation().state as { notice?: string } | null)?.notice ?? null)
  const budget = data.fins.reduce((a, f) => a + Number(f.budget_total), 0), spent = data.fins.reduce((a, f) => a + Number(f.actual_total), 0)
  return (<>
    <div className="card g3"><div><div className="lab">Orçado</div><div className="num">{brl(budget)}</div></div><div><div className="lab">Realizado</div><div className="num">{brl(spent)}</div></div><div><div className="lab">Etapas físicas</div><div className="num">{data.stages.filter(isPhysicalRow).length}<small style={{ color: 'var(--mu)', fontSize: 13 }}> de {data.stages.length}</small></div></div></div>
    <p style={{ color: 'var(--mu)', fontSize: 13, margin: '0 0 14px' }}>Orçado e realizado são a soma das etapas (aba Financeiro). O cadastro da obra não tem campo de orçamento total.</p>
    <ProjectForm key={k} initial={data.project} busy={busy} onCancel={() => setK(k + 1)} onSubmit={(i, file) => act(async () => {
      await updateProject(data.project.id, i); let w: string | undefined
      if (file) w = (await setMainImage(data.project.id, file, data.project.main_image_url)).warning
      setWarn(w ?? null); setK(k + 1); await reload()
    }, 'Obra atualizada')} />{warn && <div className="card" style={{ color: 'var(--bad)' }}>{warn}</div>}{node}
  </>)
}
