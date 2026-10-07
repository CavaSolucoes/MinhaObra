import type { DocumentCategory } from '.'
// Linhas como o Supabase devolve (nomes reais das colunas).
export type ProjectRow = { id: string; name: string; location: string; address: string | null; main_image_url: string | null; start_date: string; planned_end_date: string; status: string }
export type StageRow = { id: string; project_id: string; name: string; order_index: number; planned_start: string; planned_end: string; planned_percent: number | string; actual_percent: number | string; status: string }
export type FinRow = { stage_id: string; budget_total: number | string; actual_total: number | string; budget_materials: number | string; actual_materials: number | string; budget_labor: number | string; actual_labor: number | string; deviation?: number | string | null; consumed_percent?: number | string | null }
export type MediaRow = { id: string; project_id: string; stage_id: string | null; media_type: 'photo' | 'video'; storage_path: string; public_url: string | null; media_date: string; caption: string | null }
export type DocRow = { id: string; project_id: string; category: DocumentCategory; name: string; storage_path: string; file_type: string; file_size: number | null; created_at: string }
// Retorno de get_client_project(token)
export type ClientRpcPayload = { project: ProjectRow; stages: (StageRow & { financial: Omit<FinRow, 'stage_id'> | null })[]; media: MediaRow[]; documents: DocRow[] }
export type ProjectAdminRow = ProjectRow & { client_name: string }
export type AccessRow = { id: string; project_id: string; active: boolean; created_at: string } // token_hash nunca e lido
export type AdminProjectData = { project: ProjectAdminRow; stages: StageRow[]; fins: FinRow[]; media: MediaRow[]; docs: DocRow[]; access: AccessRow[] }
export type AdminCtx = { data: AdminProjectData; reload: () => Promise<void> }
