// SEED/DEMO — unico lugar com dados de exemplo. Sera substituido por dados reais na integracao.
// Obs.: so a divisao Materiais/Mao de obra da Estrutura vem da especificacao; as demais sao valores demo.
import type { ClientProject, Media, Stage, StageFinancial } from '../types'
import { buildCurve, weightedProgress } from '../utils/curve'


const P = 'p1'
const stageRows: [string, string, string, number, number][] = [
  ['Serviços iniciais', '2026-01-10', '2026-01-20', 100, 100],
  ['Fundação', '2026-01-21', '2026-02-28', 100, 100],
  ['Estrutura', '2026-03-01', '2026-04-30', 100, 82],
  ['Alvenaria', '2026-05-01', '2026-06-30', 100, 40],
  ['Instalações', '2026-07-01', '2026-08-31', 0, 0],
  ['Revestimentos', '2026-09-01', '2026-10-31', 0, 0],
  ['Acabamentos', '2026-11-01', '2026-12-15', 0, 0],
]
// [orcadoTotal, realizadoTotal, orcMateriais, realMateriais, orcMaoDeObra, realMaoDeObra]
const finRows: number[][] = [
  [15000, 14200, 8550, 9000, 5356, 5200], [35000, 32400, 18050, 19000, 13802, 13400],
  [48000, 51200, 31000, 34500, 17000, 16700], [27000, 22100, 12350, 13000, 9373, 9100],
  [31000, 28500, 16625, 17500, 11330, 11000], [42000, 31000, 19000, 20000, 11330, 11000],
  [52000, 4000, 2850, 3000, 1030, 1000],
]
const stages: Stage[] = stageRows.map(([name, s, e, pl, ac], i) => ({ id: `s${i + 1}`, projectId: P, name, order: i + 1, plannedStart: s, plannedEnd: e, plannedPercent: pl, actualPercent: ac }))
const financials: StageFinancial[] = finRows.map(([bt, at, bm, am, bl, al], i) => ({ stageId: `s${i + 1}`, budgetTotal: bt, actualTotal: at, budgetMaterials: bm, actualMaterials: am, budgetLabor: bl, actualLabor: al }))
const days = [
  { date: '2026-09-12', photos: 16, videos: 2, stageId: 's3', caption: 'Armação da laje do pavimento superior.' },
  { date: '2026-09-05', photos: 8, videos: 1, stageId: 's4', caption: 'Elevação da alvenaria do térreo.' },
  { date: '2026-08-28', photos: 12, videos: 0, stageId: 's3', caption: 'Concretagem de pilares.' },
]
const media: Media[] = days.flatMap((d, di) =>
  Array.from({ length: d.photos + d.videos }, (_, i): Media => ({ id: `m-${d.date}-${i}`, projectId: P, stageId: d.stageId, type: i >= d.photos ? 'video' : 'photo', date: d.date, caption: d.caption, url: null, thumbHue: 30 + ((i * 17 + di * 40) % 30) })))

export const mockClientProject: ClientProject = {
  project: { id: P, name: 'Residência Parque das Dunas', location: 'Eusébio - CE', progress: Math.round(weightedProgress(stages, financials, s => s.actualPercent)), startDate: '2026-01-10', plannedEndDate: '2026-12-15', budget: 250000, spent: 183400, mainImageUrl: null },
  stages, financials, media,
  documents: [
    { id: 'd1', projectId: P, category: 'Projetos', name: 'Projeto_Estrutural.pdf', date: '2026-09-01', fileType: 'pdf' },
    { id: 'd2', projectId: P, category: 'Projetos', name: 'Projeto_Arquitetônico.pdf', date: '2026-09-01', fileType: 'pdf' },
    { id: 'd3', projectId: P, category: 'Medições', name: 'Medição_03_Estrutura.pdf', date: '2026-09-05', fileType: 'pdf' },
    { id: 'd4', projectId: P, category: 'ART/RRT', name: 'ART_Execução.pdf', date: '2026-01-15', fileType: 'pdf' },
    { id: 'd5', projectId: P, category: 'Contratos', name: 'Contrato.pdf', date: '2026-01-10', fileType: 'pdf' },
  ],
  curve: buildCurve({ startDate: '2026-01-10', plannedEndDate: '2026-12-15' }, stages, financials),
}
