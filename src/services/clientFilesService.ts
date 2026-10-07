import { supabase, useMock } from '../lib/supabase'
export type FileKind = 'media' | 'document'
type Invoke = (body: { token: string; kind: FileKind; id: string; download?: boolean }) => Promise<{ data: unknown; error: { context?: { status?: number } } | null }>
export class FileAccessError extends Error {}
const MSG: Record<number, string> = { 401: 'Link inválido ou desativado.', 404: 'Arquivo não encontrado.' }
// Pede ao backend (Edge Function client-file-url) uma URL assinada e temporária. O cliente nunca acessa o Storage direto.
export function createClientFiles(invoke: Invoke, now: () => number = Date.now) {
  const cache = new Map<string, { url: string; exp: number }>()
  return async (token: string, kind: FileKind, id: string, download = false): Promise<string> => {
    const key = `${kind}:${id}:${download}`, hit = cache.get(key)
    if (hit && hit.exp - now() > 60_000) return hit.url // reaproveita enquanto faltar mais de 1 min para expirar
    const { data, error } = await invoke({ token, kind, id, ...(download ? { download: true } : {}) })
    if (error) throw new FileAccessError(MSG[error.context?.status ?? 0] ?? 'Não foi possível abrir o arquivo agora. Tente novamente.')
    const r = data as { url?: string; expires_in?: number } | null
    if (!r?.url) throw new FileAccessError('Não foi possível abrir o arquivo agora. Tente novamente.')
    cache.set(key, { url: r.url, exp: now() + (r.expires_in ?? 0) * 1000 })
    return r.url
  }
}
const live = createClientFiles(body => supabase.functions.invoke('client-file-url', { body }))
export const getClientFileUrl = (token: string, kind: FileKind, id: string, download = false) =>
  useMock ? Promise.reject(new FileAccessError('Modo demonstração: arquivos indisponíveis.')) : live(token, kind, id, download)
