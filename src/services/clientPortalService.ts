import type { ClientProject } from '../types'
import type { ClientRpcPayload } from '../types/db'
import { mockClientProject } from '../data/mockData'
import { supabase, useMock } from '../lib/supabase'
import { fromRpc } from './mappers'
// Cliente acessa SOMENTE via RPC get_client_project(token): sem leitura direta de tabelas, sem login.
export async function getClientProject(token: string): Promise<ClientProject> {
  if (useMock) return mockClientProject // opt-in explicito (VITE_USE_MOCK=true); nunca usado como fallback de erro
  const { data, error } = await supabase.rpc('get_client_project', { p_token: token })
  if (error) throw new Error(`Supabase: ${error.message}`)
  if (!data) throw new Error('Link inválido ou desativado.')
  return fromRpc(data as ClientRpcPayload)
}
