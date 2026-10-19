import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { listMeasurements, loadMeasurementAudit, MigrationPendingError, saveMeasurement } from '../../../services/adminApi'
import type { AuditRow, MeasurementRow } from '../../../types/db'
import { Btn, Field, FormError, Input, useAct } from '../../../components/admin/ui'
import { fmtDate, pct } from '../../../utils/format'
import { average, diffPp, newMeasurementRows, prefillValues, previousOf, syncPlan, validatePercents } from '../../../utils/measure'
import { NOTES_MAX, toNum, todayLocal, validateNotes, validateReferenceDate } from '../../../utils/validate'
import { ReferenceDateField } from '../../../components/admin/ReferenceDateField'
type Row = { key: string; stageId: string | null; name: string; order: number; locked: boolean }
// Nova medição (todas as etapas atuais) ou edição (somente os itens que a medição já tem; etapas removidas ficam imutáveis).
export default function MeasurementEditor() {
  const { data, reload } = useAdminProject(), { measurementId } = useParams(), nav = useNavigate(), { act, busy, node } = useAct(), isNew = !measurementId
  const [all, setAll] = useState<MeasurementRow[] | null>(null), [pend, setPend] = useState(false), [loadErr, setLoadErr] = useState<string | null>(null)
  const [date, setDate] = useState(todayLocal()), [notes, setNotes] = useState(''), [vals, setVals] = useState<Record<string, string>>({}), [err, setErr] = useState<string | null>(null), [audit, setAudit] = useState<AuditRow[]>([])
  const self = all?.find(m => m.id === measurementId)
  useEffect(() => { listMeasurements(data.project.id).then(setAll).catch(e => e instanceof MigrationPendingError ? setPend(true) : setLoadErr(e.message)) }, [data.project.id])
  useEffect(() => {
    if (!all) return
    if (isNew) { const last = [...all].sort((a, b) => b.reference_date.localeCompare(a.reference_date))[0]   // pré-preenche com a última medição; etapas novas, com o % atual (somente etapas físicas)
      setVals(prefillValues(data.stages, last)) }
    else if (self) { setDate(self.reference_date); setNotes(self.notes ?? ''); setVals(Object.fromEntries((self.measurement_items ?? []).map(i => [i.id, String(i.actual_percent)])))
      loadMeasurementAudit(self.id).then(setAudit).catch(() => undefined) }
  }, [all, isNew, self?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (pend) return <div className="card" style={{ color: 'var(--bad)' }}>A migration 005 (medições) ainda não foi aplicada no banco.</div>
  if (loadErr) return <div className="card" style={{ color: 'var(--bad)' }}>{loadErr}</div>
  if (!all) return <div className="lab">Carregando…</div>
  if (!isNew && !self) return <div className="card">Medição não encontrada nesta obra.</div>
  const rows: Row[] = isNew ? newMeasurementRows(data.stages)
    : [...(self!.measurement_items ?? [])].sort((a, b) => a.stage_order - b.stage_order).map(i => ({ key: i.id, stageId: i.stage_id, name: i.stage_name, order: i.stage_order, locked: !i.stage_id }))
  const noPhysical = isNew && rows.length === 0   // obra sem etapas físicas não admite medição (o banco também recusa)
  const inputs = rows.map(r => vals[r.key] ?? ''), problem = validatePercents(inputs), nums = inputs.map(v => toNum(v)), avg = problem ? null : average(nums)
  const others = all.filter(m => m.id !== self?.id).map(m => ({ date: m.reference_date, progress: Number(m.progress_percent) })), prev = !validateReferenceDate(date) ? previousOf(date, others) : null
  const plan = !validateReferenceDate(date) ? syncPlan(all.map(m => ({ id: m.id, date: m.reference_date })), self?.id ?? null, date) : null, mineId = self?.id ?? '__new__'
  const syncText = !plan ? '' : !plan.sync ? 'Há uma medição mais recente que continua sendo a mais recente: ao salvar, o estado atual das etapas não é alterado.' : plan.sourceId === mineId ? 'Esta passa a ser a medição mais recente: ao salvar, os percentuais atuais das etapas são atualizados com ela.' : `Após esta alteração a medição mais recente passa a ser a de ${fmtDate(plan.sourceDate as string)}: ao salvar, as etapas serão sincronizadas com ela.`
  const submit = () => {
    const m = validateReferenceDate(date) ?? validateNotes(notes) ?? problem
    setErr(m); if (m || avg === null || noPhysical) return
    const editable = rows.map((r, i) => ({ r, n: nums[i] })).filter(x => x.r.stageId)
    if (!window.confirm(`Salvar a medição de ${fmtDate(date)}?\nAvanço global: ${pct(avg)} (média de ${rows.length} etapas, peso igual).\n${syncText}`)) return
    act(async () => { const r = await saveMeasurement({ projectId: data.project.id, referenceDate: date, notes: notes.trim() || null, measurementId: self?.id, items: editable.map(x => ({ stage_id: x.r.stageId as string, actual_percent: x.n })) }); await reload(); nav(`../${r.id}`, { relative: 'path' }) }, 'Medição salva')
  }
  return (<>
    <Link to=".." relative="path" className="back" style={{ display: 'inline-block', textDecoration: 'none' }}>← Medições</Link>
    <h2>{isNew ? 'Nova medição' : `Medição de ${fmtDate(self!.reference_date)}`}</h2>
    <div className="card">
      <ReferenceDateField value={date} onChange={setDate} />
      <Field label="Observações (internas, não aparecem para o cliente)"><textarea style={{ width: '100%', padding: 12, marginTop: 6, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 16, minHeight: 70 }} value={notes} maxLength={NOTES_MAX} onChange={e => setNotes(e.target.value)} /></Field>
    </div>
    {noPhysical && <div className="card" style={{ color: 'var(--bad)' }}>Esta obra não tem etapas físicas. Marque ao menos uma etapa como "Etapa física" na aba Cronograma para criar medições.</div>}
    <div className="card"><div className="lab">Percentual acumulado executado por etapa</div>
      <div style={{ color: 'var(--mu)', fontSize: 13, marginTop: 4 }}>Somente etapas físicas entram na medição e na média; itens orçamentários ficam de fora.</div>
      {rows.map(r => (<label key={r.key} className="row" style={{ alignItems: 'center', marginTop: 10 }}><span>{r.order}. {r.name}{r.locked && <small style={{ color: 'var(--mu)' }}> (etapa removida — não editável)</small>}</span>
        <Input style={{ width: 96, marginTop: 0, textAlign: 'right' }} type="number" min={0} max={100} step="any" inputMode="decimal" disabled={r.locked} value={vals[r.key] ?? ''} onChange={e => setVals({ ...vals, [r.key]: e.target.value })} aria-label={`Percentual de ${r.name}`} /></label>))}
      <div className="row" style={{ marginTop: 16 }}><b>Avanço global (média simples)</b><b style={{ color: 'var(--gold)', fontSize: 20 }}>{avg === null ? '—' : pct(avg)}</b></div>
      <div style={{ color: 'var(--mu)', fontSize: 13, marginTop: 6 }}>{avg !== null && prev ? <>vs medição de {fmtDate(prev.date)} ({pct(prev.progress)}): <b style={{ color: avg - prev.progress < 0 ? 'var(--bad)' : 'var(--ok)' }}>{diffPp(avg, prev.progress) > 0 ? '+' : diffPp(avg, prev.progress) < 0 ? '−' : ''}{Math.abs(diffPp(avg, prev.progress)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.</b></> : 'Sem medição anterior para comparar.'}</div>
      <div style={{ color: 'var(--mu)', fontSize: 13, marginTop: 6 }}>{syncText}</div>
      <FormError msg={err ?? (problem && Object.keys(vals).length ? problem : null)} />
      <Btn style={{ width: '100%', marginTop: 14 }} disabled={busy || !!problem || noPhysical} onClick={submit}>{busy ? 'Salvando…' : 'Salvar medição'}</Btn></div>
    {!isNew && <><h3>HISTÓRICO DE ALTERAÇÕES</h3>{audit.map(a => <div key={a.id} className="card" style={{ fontSize: 14 }}><b>{a.action === 'create' ? 'Criada' : 'Editada'}</b> em {new Date(a.changed_at).toLocaleString('pt-BR')} · usuário …{(a.changed_by ?? '').slice(-6)}
      <div style={{ color: 'var(--mu)' }}>{a.old_data ? `Avanço ${pct(Number(a.old_data.progress_percent))} → ${pct(Number(a.new_data.progress_percent))}` : `Avanço inicial ${pct(Number(a.new_data.progress_percent))}`}{a.old_data && (a.old_data.notes ?? '') !== (a.new_data.notes ?? '') ? ' · observações alteradas' : ''}</div></div>)}{!audit.length && <div className="card" style={{ color: 'var(--mu)' }}>Sem registros.</div>}</>}
    {node}
  </>)
}
