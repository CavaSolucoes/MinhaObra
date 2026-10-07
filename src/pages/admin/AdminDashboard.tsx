import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { listProjectCards, type ProjectCard } from '../../services/adminApi'
import { PROJECT_STATUS } from '../../components/admin/ProjectForm'
import { brl, fmtDate } from '../../utils/format'
import { Btn } from '../../components/admin/ui'
export default function AdminDashboard() {
  const { signOut } = useAuth(), [list, setList] = useState<ProjectCard[] | null>(null), [err, setErr] = useState<string | null>(null)
  useEffect(() => { listProjectCards().then(setList).catch(e => setErr(e.message)) }, [])
  return (<div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>
    <div className="hd"><div><div className="logo">CAVA<b>+</b></div><div className="sub">MINHAS OBRAS</div></div><Btn style={{ marginLeft: 'auto' }} onClick={signOut}>Sair</Btn></div>
    <Link to="/admin/obra/nova" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 14 }}>+ Nova obra</Link>
    {err && <div className="card" style={{ color: 'var(--bad)' }}>{err}</div>}
    {!list && !err && <div className="lab">Carregando…</div>}
    {list?.map(({ row: p, budget, spent, photos, videos, docs }) => (
      <Link key={p.id} to={`/admin/obra/${p.id}`} className="card" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
        <div className="row"><b>{p.name}</b><span className="badge" style={{ '--c': 'var(--gold)' } as React.CSSProperties}>{PROJECT_STATUS.find(s => s[0] === p.status)?.[1] ?? p.status}</span></div>
        <div style={{ color: 'var(--mu)', fontSize: 14 }}>📍 {p.location} · {fmtDate(p.start_date)} → {fmtDate(p.planned_end_date)}</div>
        <div className="row" style={{ marginTop: 10, fontSize: 15 }}><span>Orçado {brl(budget)}</span><span>Realizado {brl(spent)}</span></div>
        <div style={{ color: 'var(--mu)', fontSize: 14, marginTop: 6 }}>{photos} fotos · {videos} vídeos · {docs} documentos</div></Link>))}
    {list?.length === 0 && <div className="card" style={{ color: 'var(--mu)' }}>Nenhuma obra ainda. Crie a primeira.</div>}
  </div>)
}
