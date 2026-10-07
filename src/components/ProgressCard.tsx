import type { Project } from '../types'
import { fmtDate } from '../utils/format'
export function ProgressCard({ project }: { project: Project }) {
  return (
    <div className="card"><div className="big">{project.progress}%</div><div className="lab">Executado</div>
      <div className="bar"><i style={{ width: `${project.progress}%` }} /></div>
      <div className="row" style={{ marginTop: 14 }}>
        <div><div className="lab">Início da obra</div><b>{fmtDate(project.startDate)}</b></div>
        <div style={{ textAlign: 'right' }}><div className="lab">Previsão de conclusão</div><b>{fmtDate(project.plannedEndDate)}</b></div>
      </div></div>)
}
