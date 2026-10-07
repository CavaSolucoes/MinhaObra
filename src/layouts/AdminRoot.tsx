import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../auth/AuthProvider'
export function RequireAdmin() {
  const { session, admin, loading, error, signOut } = useAuth(), loc = useLocation()
  if (loading) return <div className="lab" style={{ padding: 40 }}>Verificando acesso…</div>
  if (!session) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />
  if (!admin) return (<div style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}><div className="card"><b>Sem permissão</b><p style={{ color: 'var(--mu)' }}>{error ?? 'Este usuário não é administrador da CAVA+.'}</p><button className="btn" onClick={signOut}>Sair</button></div></div>)
  return <Outlet />
}
export default function AdminRoot() { return <AuthProvider><Outlet /></AuthProvider> }
