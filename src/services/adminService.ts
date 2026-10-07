import { supabase } from '../lib/supabase'
import type { ClientProject, Project } from '../types'
import type { DocRow, FinRow, MediaRow, ProjectRow, StageRow } from '../types/db'
import { buildClientProject, toFin, toProject, toStage } from './mappers'
// Leitura como admin autenticado. Quem decide o acesso e o RLS (policy admin_all), nao o frontend.
const ok = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(`Supabase: ${r.error.message}`); return (r.data ?? []) as T }
// cava_admins nao tem policy de leitura (por desenho); a checagem usa a funcao is_admin() do banco.
export async function isAdmin(): Promise<boolean> { const { data, error } = await supabase.rpc('is_admin'); if (error) throw new Error(error.message); return data === true }
export async function listProjects(): Promise<Project[]> {
  const [p, s, f] = await Promise.all([supabase.from('projects').select('*').order('created_at'), supabase.from('stages').select('*').order('order_index'), supabase.from('stage_financials').select('*')])
  const stages = ok<StageRow[]>(s), fins = ok<FinRow[]>(f)
  return ok<ProjectRow[]>(p).map(r => { const st = stages.filter(x => x.project_id === r.id).map(toStage); const ids = new Set(st.map(x => x.id)); return toProject(r, st, fins.filter(x => ids.has(x.stage_id)).map(toFin)) })
}
export async function getProjectBundle(id: string): Promise<ClientProject> {
  const [p, s, m, d] = await Promise.all([supabase.from('projects').select('*').eq('id', id).single(), supabase.from('stages').select('*').eq('project_id', id).order('order_index'),
    supabase.from('media').select('*').eq('project_id', id).order('media_date', { ascending: false }), supabase.from('documents').select('*').eq('project_id', id).order('created_at', { ascending: false })])
  const stages = ok<StageRow[]>(s), f = await supabase.from('stage_financials').select('*').in('stage_id', stages.map(x => x.id))
  return buildClientProject(ok<ProjectRow>(p as never), stages, ok<FinRow[]>(f), ok<MediaRow[]>(m), ok<DocRow[]>(d))
}
