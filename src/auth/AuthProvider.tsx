import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isAdmin as checkAdmin } from '../services/adminService'
type Auth = { session: Session | null; admin: boolean; loading: boolean; error: string | null; signIn: (e: string, p: string) => Promise<string | null>; signOut: () => Promise<void> }
const Ctx = createContext<Auth | null>(null)
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth fora do AuthProvider'); return c }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null), [admin, setAdmin] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    let live = true; setLoading(true); setError(null)
    if (!session) { setAdmin(false); setLoading(false); return }
    checkAdmin().then(v => live && setAdmin(v)).catch(e => live && (setAdmin(false), setError(e.message))).finally(() => live && setLoading(false))
    return () => { live = false }
  }, [session])
  const signIn = async (email: string, password: string) => { const { error: e } = await supabase.auth.signInWithPassword({ email, password }); return e ? e.message : null }
  const signOut = async () => { await supabase.auth.signOut() }
  return <Ctx.Provider value={{ session, admin, loading, error, signIn, signOut }}>{children}</Ctx.Provider>
}
