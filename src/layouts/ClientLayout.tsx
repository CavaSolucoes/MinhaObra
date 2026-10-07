import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { useLoadClientProject } from '../hooks/useClientProject'
export default function ClientLayout() {
  const { token = '' } = useParams(), { pathname } = useLocation()
  const { data, error } = useLoadClientProject(token)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  if (error) return <div id="app"><div className="card" style={{ marginTop: 40 }}><b>Não foi possível carregar a obra.</b><div style={{ color: 'var(--mu)', marginTop: 6, fontSize: 14 }}>{error}</div></div></div>
  if (!data) return <div id="app"><div className="lab" style={{ paddingTop: 40 }}>Carregando…</div></div>
  return <AppShell data={data} />
}
