import type { Project } from '../types'
import { fmtDate } from '../utils/format'
import { pct } from '../utils/format'
import type { OverallProgress } from '../utils/measure'
// Avanço físico = última medição; sem medições, média simples dos percentuais atuais das etapas (todas com o mesmo peso).
export function ProgressCard({ project, progress }: { project: Project; progress: OverallProgress }) {
  const v = progress.percent
  return (
    <div className="card"><div className="big">{v === null ? '—' : pct(v)}</div><div className="lab">Executado</div>
      <div className="bar"><i style={{ width: `${v ?? 0}%` }} /></div>
      <div style={{ color: 'var(--mu)', fontSize: 13, marginTop: 8 }}>{progress.basis === 'measurement' && progress.date ? `Última medição: ${fmtDate(progress.date)}` : progress.basis === 'stages' ? 'Média das etapas (ainda sem medições)' : 'Avanço ainda não disponível'}</div>
      <div className="row" style={{ marginTop: 14 }}>
        <div><div className="lab">Início da obra</div><b>{fmtDate(project.startDate)}</b></div>
        <div style={{ textAlign: 'right' }}><div className="lab">Previsão de conclusão</div><b>{fmtDate(project.plannedEndDate)}</b></div>
      </div></div>)
}
