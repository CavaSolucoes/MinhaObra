import { useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
export const inp: CSSProperties = { width: '100%', padding: 12, marginTop: 6, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 16 }
export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="lab" style={{ display: 'block', marginTop: 12 }}>{label}{children}{hint && <small style={{ display: 'block', textTransform: 'none', letterSpacing: 0, color: 'var(--mu)', marginTop: 4 }}>{hint}</small>}</label>)
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input style={inp} {...p} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select style={inp} {...p} />
export const Btn = ({ danger, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) => (
  <button type="button" className="btn" style={{ textAlign: 'center', ...(danger ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : {}), ...(p.disabled ? { opacity: 0.5 } : {}) }} {...p} />)
export const FormError = ({ msg }: { msg: string | null }) => (msg ? <p style={{ color: 'var(--bad)', margin: '12px 0 0' }}>{msg}</p> : null)
// Executa uma acao assíncrona mostrando sucesso ou o erro REAL do Supabase (nunca silencia).
export function useAct() {
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ t: string; bad: boolean } | null>(null), timer = useRef<number | undefined>(undefined)
  const show = (t: string, bad: boolean) => { setMsg({ t, bad }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setMsg(null), bad ? 9000 : 2500) }
  const act = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true)
    try { await fn(); if (okMsg) show(okMsg, false); return true } catch (e) { show(e instanceof Error ? e.message : 'Erro desconhecido', true); return false } finally { setBusy(false) }
  }
  const node = msg && <div className="toast" style={msg.bad ? { background: 'var(--bad)', color: '#fff', maxWidth: '92%' } : undefined}>{msg.t}</div>
  return { act, busy, node }
}
