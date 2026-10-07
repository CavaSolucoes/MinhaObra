import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// Unica instancia do cliente. Somente URL + anon key (publicas). RLS no banco e a barreira real.
const env: Record<string, string | undefined> = import.meta.env ?? {} // `?? {}` permite importar este modulo fora do Vite (testes)
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
export const missingEnv = [!url && 'VITE_SUPABASE_URL', !anon && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean) as string[]
// Se faltar variavel, main.tsx nao monta o app (EnvMissing); o cast so existe para esse caso.
export const supabase: SupabaseClient = missingEnv.length ? (null as unknown as SupabaseClient) : createClient(url!, anon!)
export const useMock = env.VITE_USE_MOCK === 'true'
