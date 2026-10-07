import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
export default function AdminLogin() {
  const { session, signIn } = useAuth(), nav = useNavigate()
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/admin" replace />
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); const m = await signIn(email, pw); setBusy(false); m ? setErr(m) : nav('/admin') }
  const f = { width: '100%', padding: 14, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 16, marginTop: 6 } as const
  return (<div style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
    <div className="hd"><div><div className="logo">CAVA<b>+</b></div><div className="sub">ÁREA ADMINISTRATIVA</div></div></div>
    <form className="card" onSubmit={submit}>
      <label className="lab">E-mail<input style={f} type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label className="lab" style={{ display: 'block', marginTop: 14 }}>Senha<input style={f} type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required /></label>
      {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
      <button className="btn" style={{ marginTop: 16, width: '100%', textAlign: 'center' }} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form></div>)
}
