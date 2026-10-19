import type { DocumentCategory } from '.'
// Linhas como o Supabase devolve (nomes reais das colunas).
export type ProjectRow = { id: string; name: string; location: string; address: string | null; main_image_url: string | null; start_date: string; planned_end_date: string; status: string }
export type StageRow = { id: string; project_id: string; name: string; order_index: number; planned_start: string; planned_end: string; planned_percent: number | string; actual_percent: number | string; status: string; is_physical?: boolean }
export type FinRow = { stage_id: string; budget_total: number | string; actual_total: number | string; budget_materials: number | string; actual_materials: number | string; budget_labor: number | string; actual_labor: number | string; deviation?: number | string | null; consumed_percent?: number | string | null }
export type MediaRow = { id: string; project_id: string; stage_id: string | null; media_type: 'photo' | 'video'; storage_path: string; public_url: string | null; media_date: string; caption: string | null }
export type DocRow = { id: string; project_id: string; category: DocumentCategory; name: string; storage_path: string; file_type: string; file_size: number | null; created_at: string }
// Retorno de get_client_project(token)
export type ClientRpcPayload = { project: ProjectRow; stages: (StageRow & { financial: Omit<FinRow, 'stage_id'> | null })[]; media: MediaRow[]; documents: DocRow[] }
export type ProjectAdminRow = ProjectRow & { client_name: string }
export type AccessRow = { id: string; project_id: string; active: boolean; created_at: string } // token_hash nunca e lido
export type AdminProjectData = { project: ProjectAdminRow; stages: StageRow[]; fins: FinRow[]; media: MediaRow[]; docs: DocRow[]; access: AccessRow[] }
export type AdminCtx = { data: AdminProjectData; reload: () => Promise<void> }
// medições (migration 005)
export type MeasurementItemRow = { id: string; measurement_id: string; stage_id: string | null; stage_name: string; stage_order: number; actual_percent: number | string }
export type MeasurementRow = { id: string; project_id: string; reference_date: string; notes: string | null; progress_percent: number | string; created_by: string | null; created_at: string; updated_by: string | null; updated_at: string; measurement_items?: MeasurementItemRow[] }
export type AuditRow = { id: number; measurement_id: string | null; action: 'create' | 'update'; changed_by: string | null; changed_at: string; old_data: { progress_percent?: number | string; notes?: string | null } | null; new_data: { progress_percent?: number | string; notes?: string | null } }
export type ClientMeasurementRpc = { id: string; reference_date: string; progress_percent: number | string; items: { stage_name: string; stage_order: number; actual_percent: number | string }[] }
export type ClientMeasurementsPayload = { measurements: ClientMeasurementRpc[]; physical_stage_ids: string[] }   // retorno de get_client_measurements (migration 005)
