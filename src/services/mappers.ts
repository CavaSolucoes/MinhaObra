import type { ClientProject, Media, MeasurementPoint, Project, ProjectDocument, Stage, StageFinancial } from '../types'
import type { ClientMeasurementRpc, ClientRpcPayload, DocRow, FinRow, MediaRow, ProjectRow, StageRow } from '../types/db'
export const toStage = (r: StageRow): Stage => ({ id: r.id, projectId: r.project_id, name: r.name, order: r.order_index, plannedStart: r.planned_start, plannedEnd: r.planned_end, plannedPercent: Number(r.planned_percent), actualPercent: Number(r.actual_percent), status: r.status, isPhysical: r.is_physical ?? true })
export const toFin = (r: FinRow): StageFinancial => ({ stageId: r.stage_id, budgetTotal: Number(r.budget_total), actualTotal: Number(r.actual_total), budgetMaterials: Number(r.budget_materials), actualMaterials: Number(r.actual_materials), budgetLabor: Number(r.budget_labor), actualLabor: Number(r.actual_labor) })
export const toMedia = (r: MediaRow): Media => ({ id: r.id, projectId: r.project_id, stageId: r.stage_id, type: r.media_type, date: r.media_date, caption: r.caption, url: r.public_url, thumbHue: 35 })
export const toDoc = (r: DocRow): ProjectDocument => ({ id: r.id, projectId: r.project_id, category: r.category, name: r.name, date: r.created_at.slice(0, 10), fileType: r.file_type })
// budget/spent = soma real do banco (financeiro). O avanço físico NÃO vem daqui: é a média simples das etapas / última medição (utils/measure).
export const toProject = (r: ProjectRow, _stages: Stage[], fins: StageFinancial[]): Project => ({
  id: r.id, name: r.name, location: r.location, startDate: r.start_date, plannedEndDate: r.planned_end_date, mainImageUrl: r.main_image_url,
  budget: fins.reduce((a, f) => a + f.budgetTotal, 0), spent: fins.reduce((a, f) => a + f.actualTotal, 0),
})
export function buildClientProject(pr: ProjectRow, sr: StageRow[], fr: FinRow[], mr: MediaRow[], dr: DocRow[], measurements: MeasurementPoint[] = [], physicalIds: string[] | null = null): ClientProject {
  const stages = sr.map(toStage).map(s => (physicalIds ? { ...s, isPhysical: physicalIds.includes(s.id) } : s)).sort((a, b) => a.order - b.order), financials = fr.map(toFin), project = toProject(pr, stages, financials)
  return { project, stages, financials, media: mr.map(toMedia), documents: dr.map(toDoc), measurements }
}
export const toMeasurementPoints = (rows: ClientMeasurementRpc[]): MeasurementPoint[] =>
  rows.map(m => ({ id: m.id, date: m.reference_date, progress: Number(m.progress_percent), items: m.items.map(i => ({ stageName: i.stage_name, order: i.stage_order, percent: Number(i.actual_percent) })) })).sort((a, b) => a.date.localeCompare(b.date))
export type ParsedMeasurements = { measurements: ClientMeasurementRpc[]; physicalIds: string[] | null }
// get_client_measurements devolve { measurements, physical_stage_ids }. Aceita também o formato antigo (lista simples => todas as etapas físicas).
export function parseMeasurementsPayload(data: unknown): ParsedMeasurements {
  if (Array.isArray(data)) return { measurements: data as ClientMeasurementRpc[], physicalIds: null }
  const o = data as { measurements?: unknown; physical_stage_ids?: unknown } | null
  if (o && typeof o === 'object') return { measurements: Array.isArray(o.measurements) ? (o.measurements as ClientMeasurementRpc[]) : [], physicalIds: Array.isArray(o.physical_stage_ids) ? (o.physical_stage_ids as string[]) : null }
  return { measurements: [], physicalIds: null }
}
export const fromRpc = (p: ClientRpcPayload, m: ParsedMeasurements | ClientMeasurementRpc[] = { measurements: [], physicalIds: null }): ClientProject => {
  const parsed: ParsedMeasurements = Array.isArray(m) ? { measurements: m, physicalIds: null } : m
  return buildClientProject(p.project, p.stages, p.stages.flatMap(s => (s.financial ? [{ ...s.financial, stage_id: s.id }] : [])), p.media, p.documents, toMeasurementPoints(parsed.measurements), parsed.physicalIds)
}
