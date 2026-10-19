import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { listMeasurements, MigrationPendingError } from '../../../services/adminApi'
import type { MeasurementRow } from '../../../types/db'
import { fmtDate, pct } from '../../../utils/format'
import { diffPp, round4 } from '../../../utils/measure'
export default function ProjectMeasurements() {
  const { data } = useAdminProject(), [rows, setRows] = useState<MeasurementRow[] | null>(null), [err, setErr] = useState<string | null>(null), [pend, setPend] = useState(false)
  useEffect(() => { listMeasurements(data.project.id).then(setRows).catch(e => e instanceof MigrationPendingError ? setPend(true) : setErr(e.message)) }, [data.project.id])
  if (pend) return <div className="card" style={{ color: 'var(--bad)' }}>A migration <code>005_measurements.sql</code> ainda não foi aplicada no banco. Aplique-a no Supabase para usar as medições.</div>
  const list = [...(rows ?? [])].sort((a, b) => b.reference_date.localeCompare(a.reference_date))
  return (<>
    <Link to="nova" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 14 }}>+ Nova medição</Link>
    {err && <div className="card" style={{ color: 'var(--bad)' }}>{err}</div>}{!rows && !err && <div className="lab">Carregando…</div>}
    {list.map((m, i) => { const prev = list[i + 1], d = prev ? diffPp(Number(m.progress_percent), Number(prev.progress_percent)) : null
      return (<Link key={m.id} to={m.id} className="card" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <div className="row"><b>{fmtDate(m.reference_date)}</b>{i === 0 && <span className="badge" style={{ '--c': 'var(--gold)' } as React.CSSProperties}>Mais recente</span>}</div>
        <div className="row" style={{ marginTop: 8 }}><span style={{ fontSize: 22, fontWeight: 700 }}>{pct(Number(m.progress_percent))}</span>
          <span style={{ color: d === null ? 'var(--mu)' : d < 0 ? 'var(--bad)' : 'var(--ok)' }}>{d === null ? 'primeira medição' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(round4(d)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p. vs anterior`}</span></div>
        <div style={{ color: 'var(--mu)', fontSize: 13, marginTop: 4 }}>{m.measurement_items?.length ?? 0} etapas{m.notes ? ' · com observações' : ''}</div></Link>) })}
    {rows && !rows.length && <div className="card" style={{ color: 'var(--mu)' }}>Nenhuma medição registrada. Crie a primeira para iniciar a curva realizada.</div>}
  </>)
}
