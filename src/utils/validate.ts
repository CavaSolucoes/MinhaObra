const pad = (n: number) => String(n).padStart(2, '0')
export const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
export const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))
export const fmtSize = (n: number | null) => (n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
export function validateProject(f: { name: string; client_name: string; location: string; start_date: string; planned_end_date: string }): string | null {
  if (!f.name.trim()) return 'Informe o nome da obra.'
  if (!f.client_name.trim()) return 'Informe o nome do cliente (uso interno).'
  if (!f.location.trim()) return 'Informe a localização.'
  if (!isDate(f.start_date) || !isDate(f.planned_end_date)) return 'Informe datas válidas.'
  if (f.planned_end_date < f.start_date) return 'O término previsto não pode ser antes do início.'
  return null
}
// As mesmas regras existem como CHECK no banco; estas apenas dao feedback rapido.
export function validateStage(f: { name: string; planned_start: string; planned_end: string; planned_percent: string; actual_percent: string }): string | null {
  if (!f.name.trim()) return 'Informe o nome da etapa.'
  if (!isDate(f.planned_start) || !isDate(f.planned_end)) return 'Informe datas válidas.'
  if (f.planned_end < f.planned_start) return 'A data final não pode ser antes da inicial.'
  for (const v of [f.planned_percent, f.actual_percent]) { const n = toNum(v); if (!(n >= 0 && n <= 100)) return 'Percentuais devem estar entre 0 e 100.' }
  return null
}
