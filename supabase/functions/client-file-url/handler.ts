// Lógica pura da Edge Function (sem Deno/Supabase aqui) para poder ser testada.
// O token é validado pelo MESMO mecanismo do portal: a RPC get_client_project(token), que já devolve
// somente a obra daquele token. Um arquivo só é assinado se estiver nessa resposta (= pertence à obra).
export type ClientPayload = {
  project?: { id: string; main_image_url: string | null }
  media: { id: string; media_type: 'photo' | 'video'; storage_path: string }[]
  documents: { id: string; name: string; storage_path: string }[]
} | null
export type Deps = {
  getClientProject: (token: string) => Promise<ClientPayload>
  signUrl: (bucket: string, path: string, ttlSeconds: number, downloadName?: string) => Promise<string | null>
}
// Validade curta: foto 10 min, vídeo 30 min (o player refaz requisições ao pular), documento 5 min.
export const TTL = { photo: 600, video: 1800, document: 300 } as const
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const TOKEN = /^[A-Za-z0-9_-]{6,128}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)
  let b: { token?: unknown; kind?: unknown; id?: unknown; download?: unknown }
  try { b = await req.json() } catch { return reply({ error: 'bad_request' }, 400) }
  if (typeof b.token !== 'string' || !TOKEN.test(b.token) || typeof b.id !== 'string' || !UUID.test(b.id) || (b.kind !== 'media' && b.kind !== 'document' && b.kind !== 'project_image')) return reply({ error: 'bad_request' }, 400)

  let payload: ClientPayload
  try { payload = await deps.getClientProject(b.token) } catch { return reply({ error: 'unavailable' }, 502) }
  if (!payload) return reply({ error: 'invalid_token' }, 401)

  // Inexistente e "de outra obra" têm a mesma resposta: o cliente não descobre nada além da própria obra.
  const m = b.kind === 'media' ? payload.media?.find(x => x.id === b.id) : undefined
  const d = b.kind === 'document' ? payload.documents?.find(x => x.id === b.id) : undefined
  // Foto principal da obra: só a da PRÓPRIA obra do token (id = id da obra), caminho dentro da pasta da obra, nunca URL externa.
  const pr = b.kind === 'project_image' ? payload.project : undefined
  const img = pr && pr.id === b.id && pr.main_image_url && !/^https?:/i.test(pr.main_image_url) && pr.main_image_url.startsWith(`${pr.id}/`) ? { storage_path: pr.main_image_url } : undefined
  const item = m ?? d ?? img
  if (!item) return reply({ error: 'not_found' }, 404)

  const type = m ? m.media_type : img ? 'photo' : 'document'
  const bucket = type === 'photo' ? 'photos' : type === 'video' ? 'videos' : 'documents'
  const ttl = TTL[type]
  let url: string | null
  try { url = await deps.signUrl(bucket, item.storage_path, ttl, d && b.download === true ? d.name : undefined) } catch { url = null }
  if (!url) return reply({ error: 'unavailable' }, 502)
  return reply({ url, expires_in: ttl })
}
