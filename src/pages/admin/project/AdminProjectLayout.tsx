import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { loadAdminProject } from '../../../services/adminApi'
import type { AdminProjectData } from '../../../types/db'
const TABS = [['', 'Visão geral'], ['cronograma', 'Cronograma'], ['financeiro', 'Financeiro'], ['fotos', 'Fotos'], ['documentos', 'Documentos'], ['link', 'Link do cliente']]
export default function AdminProjectLayout() {
  const { projectId = '' } = useParams(), [data, setData] = useState<AdminProjectData | null>(null), [err, setErr] = useState<string | null>(null)
  const reload = useCallback(async () => { try { setData(await loadAdminProject(projectId)); setErr(null) } catch (e) { setErr(e instanceof Error ? e.message : 'Erro') } }, [projectId])
  useEffect(() => { setData(null); reload() }, [reload])
  return (<div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 60px' }}>
    <Link to="/admin" className="back" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}>← Minhas obras</Link>
    {err && <div className="card" style={{ color: 'var(--bad)' }}>{err}</div>}
    {!data && !err && <div className="lab">Carregando…</div>}
    {data && (<><h2 style={{ marginBottom: 4 }}>{data.project.name}</h2><div style={{ color: 'var(--mu)', marginBottom: 12 }}>📍 {data.project.location}</div>
      <div className="tabs">{TABS.map(([p, l]) => <NavLink key={l} end={!p} to={p || '.'} className={({ isActive }) => `chip ${isActive ? 'on' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{l}</NavLink>)}</div>
      <Outlet context={{ data, reload }} /></>)}
  </div>)
}
