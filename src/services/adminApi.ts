import { supabase } from '../lib/supabase'
import { BUCKETS, storagePath } from './storageService'
import type { DocumentCategory } from '../types'
import type { AccessRow, AdminProjectData, DocRow, FinRow, MediaRow, ProjectAdminRow, StageRow } from '../types/db'
// Todas as escritas passam pelo RLS (policy admin_all / admin_storage_all). Nada aqui contorna permissao.
type Res<T> = { data: T | null; error: { message: string } | null }
const run = async <T,>(p: PromiseLike<Res<T>>): Promise<T> => { const { data, error } = await p; if (error) throw new Error(error.message); return data as T }
const rows = async <T,>(p: PromiseLike<Res<T[]>>): Promise<T[]> => (await run(p)) ?? []
const delOne = async (table: string, id: string) => { if (!(await rows<unknown>(supabase.from(table).delete().eq('id', id).select('id'))).length) throw new Error('Nada foi excluído (registro inexistente ou sem permissão).') }
type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS]

// ---- leitura
export async function loadAdminProject(id: string): Promise<AdminProjectData> {
  const [project, stages, media, docs, access] = await Promise.all([
    run<ProjectAdminRow>(supabase.from('projects').select('*').eq('id', id).single()),
    rows<StageRow>(supabase.from('stages').select('*').eq('project_id', id).order('order_index')),
    rows<MediaRow>(supabase.from('media').select('*').eq('project_id', id).order('media_date', { ascending: false })),
    rows<DocRow>(supabase.from('documents').select('*').eq('project_id', id).order('created_at', { ascending: false })),
    rows<AccessRow>(supabase.from('project_access').select('id,project_id,active,created_at').eq('project_id', id).order('created_at', { ascending: false })),
  ])
  const fins = stages.length ? await rows<FinRow>(supabase.from('stage_financials').select('*').in('stage_id', stages.map(s => s.id))) : []
  return { project, stages, fins, media, docs, access }
}
export type ProjectCard = { row: ProjectAdminRow; budget: number; spent: number; photos: number; videos: number; docs: number }
export async function listProjectCards(): Promise<ProjectCard[]> {
  const [p, s, f, m, d] = await Promise.all([rows<ProjectAdminRow>(supabase.from('projects').select('*').order('created_at', { ascending: false })), rows<StageRow>(supabase.from('stages').select('id,project_id')),
    rows<FinRow>(supabase.from('stage_financials').select('stage_id,budget_total,actual_total')), rows<MediaRow>(supabase.from('media').select('project_id,media_type')), rows<DocRow>(supabase.from('documents').select('project_id'))])
  return p.map(row => {
    const ids = new Set(s.filter(x => x.project_id === row.id).map(x => x.id)), fin = f.filter(x => ids.has(x.stage_id)), md = m.filter(x => x.project_id === row.id)
    return { row, budget: fin.reduce((a, x) => a + Number(x.budget_total), 0), spent: fin.reduce((a, x) => a + Number(x.actual_total), 0), photos: md.filter(x => x.media_type === 'photo').length, videos: md.filter(x => x.media_type === 'video').length, docs: d.filter(x => x.project_id === row.id).length }
  })
}

// ---- obras (colunas reais de projects)
export type ProjectInput = { name: string; client_name: string; location: string; address: string | null; start_date: string; planned_end_date: string; status: string }
export const createProject = (i: ProjectInput) => run<{ id: string }>(supabase.from('projects').insert(i).select('id').single())
export const updateProject = (id: string, i: ProjectInput) => run<{ id: string }>(supabase.from('projects').update(i).eq('id', id).select('id').single())

// ---- etapas. order_index tem UNIQUE(project_id, order_index) "deferred": cada chamada e uma transacao, entao a troca usa um valor temporario.
// O status NAO e enviado: o trigger stage_set_status do banco o recalcula a partir dos percentuais.
export type StageInput = { name: string; planned_start: string; planned_end: string; planned_percent: number; actual_percent: number }
export const createStage = (projectId: string, i: StageInput & { order_index: number }) => run<{ id: string }>(supabase.from('stages').insert({ project_id: projectId, ...i }).select('id').single())
export const updateStage = (id: string, i: StageInput) => run<{ id: string }>(supabase.from('stages').update(i).eq('id', id).select('id').single())
export const deleteStage = (id: string) => delOne('stages', id)
export async function swapStages(a: { id: string; order_index: number }, b: { id: string; order_index: number }, tmp: number) {
  const set = (id: string, order_index: number) => run<{ id: string }>(supabase.from('stages').update({ order_index }).eq('id', id).select('id').single())
  await set(a.id, tmp); await set(b.id, a.order_index); await set(a.id, b.order_index)
}

// ---- financeiro (um registro por etapa; deviation e consumed_percent sao colunas geradas no banco)
export type FinInput = { budget_total: number; actual_total: number; budget_materials: number; actual_materials: number; budget_labor: number; actual_labor: number }
export const saveFinancial = (stageId: string, i: FinInput) => run<{ stage_id: string }>(supabase.from('stage_financials').upsert({ stage_id: stageId, ...i }, { onConflict: 'stage_id' }).select('stage_id').single())

// ---- storage
const safeName = (n: string) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80)
const rmFile = async (bucket: Bucket, path: string) => { const { error } = await supabase.storage.from(bucket).remove([path]); if (error) throw new Error(error.message) }
export async function signedUrls(bucket: Bucket, paths: string[], secs = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, secs)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data ?? []).flatMap(x => (x.signedUrl && x.path ? [[x.path, x.signedUrl]] : [])))
}
export async function signedUrl(bucket: Bucket, path: string, secs = 300, download?: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, secs, download ? { download } : undefined)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
export async function uploadMedia(projectId: string, o: { file: File; date: string; stageId: string | null; caption: string | null }) {
  const video = o.file.type.startsWith('video/')
  if (!video && !o.file.type.startsWith('image/')) throw new Error('formato não suportado (use imagem ou vídeo)')
  const bucket = video ? BUCKETS.video : BUCKETS.photo, path = storagePath(projectId, o.date, `${crypto.randomUUID()}-${safeName(o.file.name)}`)
  const up = await supabase.storage.from(bucket).upload(path, o.file, { contentType: o.file.type, upsert: false })
  if (up.error) throw new Error(up.error.message)
  const ins = await supabase.from('media').insert({ project_id: projectId, stage_id: o.stageId, media_type: video ? 'video' : 'photo', storage_path: path, media_date: o.date, caption: o.caption })
  if (ins.error) { await supabase.storage.from(bucket).remove([path]); throw new Error(ins.error.message) }
}
export async function deleteMedia(m: MediaRow) { await rmFile(m.media_type === 'video' ? BUCKETS.video : BUCKETS.photo, m.storage_path); await delOne('media', m.id) }

const SLUG: Record<DocumentCategory, string> = { Projetos: 'projetos', 'Notas fiscais': 'notas-fiscais', 'Medições': 'medicoes', 'ART/RRT': 'art-rrt', Contratos: 'contratos', Outros: 'outros' }
export async function uploadDocument(projectId: string, o: { file: File; category: DocumentCategory; name: string }) {
  const path = storagePath(projectId, SLUG[o.category], `${crypto.randomUUID()}-${safeName(o.file.name)}`)
  const up = await supabase.storage.from(BUCKETS.document).upload(path, o.file, { contentType: o.file.type || undefined, upsert: false })
  if (up.error) throw new Error(up.error.message)
  const ext = o.file.name.includes('.') ? o.file.name.split('.').pop()!.toLowerCase() : 'file'
  const ins = await supabase.from('documents').insert({ project_id: projectId, category: o.category, name: o.name, storage_path: path, file_type: ext, file_size: o.file.size })
  if (ins.error) { await supabase.storage.from(BUCKETS.document).remove([path]); throw new Error(ins.error.message) }
}
export async function deleteDocument(d: DocRow) { await rmFile(BUCKETS.document, d.storage_path); await delOne('documents', d.id) }

// ---- link do cliente (token so existe em memoria no momento da criacao; o banco guarda apenas o hash)
export const createAccessLink = (projectId: string) => run<string>(supabase.rpc('create_access_link', { p_project: projectId }))
export const setAccessActive = (id: string, active: boolean) => run<{ id: string }>(supabase.from('project_access').update({ active }).eq('id', id).select('id').single())
