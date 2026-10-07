import type { ClientProject, Media, Project, ProjectDocument, Stage, StageFinancial } from '../types'
import type { ClientRpcPayload, DocRow, FinRow, MediaRow, ProjectRow, StageRow } from '../types/db'
import { buildCurve, weightedProgress } from '../utils/curve'
export const toStage = (r: StageRow): Stage => ({ id: r.id, projectId: r.project_id, name: r.name, order: r.order_index, plannedStart: r.planned_start, plannedEnd: r.planned_end, plannedPercent: Number(r.planned_percent), actualPercent: Number(r.actual_percent), status: r.status })
export const toFin = (r: FinRow): StageFinancial => ({ stageId: r.stage_id, budgetTotal: Number(r.budget_total), actualTotal: Number(r.actual_total), budgetMaterials: Number(r.budget_materials), actualMaterials: Number(r.actual_materials), budgetLabor: Number(r.budget_labor), actualLabor: Number(r.actual_labor) })
export const toMedia = (r: MediaRow): Media => ({ id: r.id, projectId: r.project_id, stageId: r.stage_id, type: r.media_type, date: r.media_date, caption: r.caption, url: r.public_url, thumbHue: 35 })
export const toDoc = (r: DocRow): ProjectDocument => ({ id: r.id, projectId: r.project_id, category: r.category, name: r.name, date: r.created_at.slice(0, 10), fileType: r.file_type })
// budget/spent = soma real do banco. progress = media ponderada pelo orcamento das etapas (provisorio; regra definitiva pendente).
export const toProject = (r: ProjectRow, stages: Stage[], fins: StageFinancial[]): Project => ({
  id: r.id, name: r.name, location: r.location, startDate: r.start_date, plannedEndDate: r.planned_end_date, mainImageUrl: r.main_image_url,
  budget: fins.reduce((a, f) => a + f.budgetTotal, 0), spent: fins.reduce((a, f) => a + f.actualTotal, 0),
  progress: stages.length ? Math.round(weightedProgress(stages, fins, s => s.actualPercent)) : 0,
})
export function buildClientProject(pr: ProjectRow, sr: StageRow[], fr: FinRow[], mr: MediaRow[], dr: DocRow[]): ClientProject {
  const stages = sr.map(toStage).sort((a, b) => a.order - b.order), financials = fr.map(toFin), project = toProject(pr, stages, financials)
  return { project, stages, financials, media: mr.map(toMedia), documents: dr.map(toDoc), curve: buildCurve(project, stages, financials) }
}
export const fromRpc = (p: ClientRpcPayload): ClientProject =>
  buildClientProject(p.project, p.stages, p.stages.flatMap(s => (s.financial ? [{ ...s.financial, stage_id: s.id }] : [])), p.media, p.documents)
