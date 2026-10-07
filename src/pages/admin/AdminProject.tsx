import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjectBundle } from '../../services/adminService'
import { brl, fmtDate } from '../../utils/format'
import type { ClientProject } from '../../types'
// Somente leitura (Fase C). Edicao/CRUD fica para a proxima fase.
export default function AdminProject() {
  const { projectId = '' } = useParams(), [d, setD] = useState<ClientProject | null>(null), [err, setErr] = useState<string | null>(null)
  useEffect(() => { getProjectBundle(projectId).then(setD).catch(e => setErr(e.message)) }, [projectId])
  return (<div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>
    <Link to="/admin" className="back" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}>← Minhas obras</Link>
    {err && <div className="card" style={{ color: 'var(--bad)' }}>{err}</div>}
    {d && (<><h2>{d.project.name}</h2><div style={{ color: 'var(--mu)', marginBottom: 14 }}>📍 {d.project.location} · {fmtDate(d.project.startDate)} → {fmtDate(d.project.plannedEndDate)}</div>
      <div className="card g3"><div><div className="lab">Orçamento</div><div className="num">{brl(d.project.budget)}</div></div><div><div className="lab">Realizado</div><div className="num">{brl(d.project.spent)}</div></div><div><div className="lab">Fotos/vídeos · Docs</div><div className="num">{d.media.length} · {d.documents.length}</div></div></div>
      <h3>ETAPAS (ORDER_INDEX)</h3>
      {d.stages.map(s => { const f = d.financials.find(x => x.stageId === s.id); return (<div key={s.id} className="card"><div className="row"><b>{s.order}. {s.name}</b><span className="badge" style={{ '--c': 'var(--gold)' } as React.CSSProperties}>{s.status}</span></div>
        <div style={{ color: 'var(--mu)', fontSize: 14, margin: '4px 0' }}>{fmtDate(s.plannedStart)} → {fmtDate(s.plannedEnd)} · plan. {s.plannedPercent}% · real. {s.actualPercent}%</div>
        {f && <div className="row" style={{ fontSize: 14 }}><span>Orçado {brl(f.budgetTotal)}</span><span>Realizado {brl(f.actualTotal)}</span></div>}</div>) })}</>)}
  </div>)
}
