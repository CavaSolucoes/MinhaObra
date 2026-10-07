import { useState, type FormEvent } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { saveFinancial, type FinInput } from '../../../services/adminApi'
import type { FinRow, StageRow } from '../../../types/db'
import { Btn, Field, FormError, Input, useAct } from '../../../components/admin/ui'
import { brl, pct } from '../../../utils/format'
import { toNum } from '../../../utils/validate'
const FIELDS: [keyof FinInput, string][] = [['budget_total', 'Orçado total'], ['actual_total', 'Realizado total'], ['budget_materials', 'Materiais · orçado'], ['actual_materials', 'Materiais · realizado'], ['budget_labor', 'Mão de obra · orçado'], ['actual_labor', 'Mão de obra · realizado']]
function FinForm({ fin, busy, onSave, onCancel }: { fin?: FinRow; busy: boolean; onSave: (i: FinInput) => void; onCancel: () => void }) {
  const [f, setF] = useState<Record<keyof FinInput, string>>(() => Object.fromEntries(FIELDS.map(([k]) => [k, fin ? String(fin[k]) : ''])) as Record<keyof FinInput, string>)
  const [err, setErr] = useState<string | null>(null)
  const n = (k: keyof FinInput) => toNum(f[k]), parts = (n('budget_materials') + n('budget_labor')), partsA = (n('actual_materials') + n('actual_labor'))
  const submit = (e: FormEvent) => { e.preventDefault(); const bad = FIELDS.find(([k]) => !(n(k) >= 0)); setErr(bad ? `"${bad[1]}": informe um valor numérico maior ou igual a 0 (use 0 se não houver).` : null); if (!bad) onSave(Object.fromEntries(FIELDS.map(([k]) => [k, n(k)])) as FinInput) }
  return (<form onSubmit={submit} style={{ marginTop: 12 }}>
    <div className="kv">{FIELDS.map(([k, l]) => <Field key={k} label={l}><Input type="number" min={0} step="0.01" inputMode="decimal" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></Field>)}</div>
    {parts >= 0 && n('budget_total') >= 0 && Math.abs(parts - n('budget_total')) > 0.005 && <p style={{ color: 'var(--mu)', fontSize: 13 }}>Aviso: materiais + mão de obra (orçado) = {brl(parts)}, diferente do orçado total.</p>}
    {partsA >= 0 && n('actual_total') >= 0 && Math.abs(partsA - n('actual_total')) > 0.005 && <p style={{ color: 'var(--mu)', fontSize: 13 }}>Aviso: materiais + mão de obra (realizado) = {brl(partsA)}, diferente do realizado total.</p>}
    <FormError msg={err} /><div className="row" style={{ marginTop: 12 }}><Btn type="submit" disabled={busy} style={{ flex: 1 }}>Salvar</Btn><Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn></div></form>)
}
export default function ProjectFinancial() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct(), [open, setOpen] = useState<string | null>(null)
  const stages = [...data.stages].sort((a, b) => a.order_index - b.order_index)
  const save = (s: StageRow, i: FinInput) => act(async () => { await saveFinancial(s.id, i); await reload(); setOpen(null) }, 'Financeiro salvo')
  if (!stages.length) return <div className="card" style={{ color: 'var(--mu)' }}>Crie etapas no Cronograma para lançar o financeiro.</div>
  return (<>{stages.map(s => { const f = data.fins.find(x => x.stage_id === s.id), d = f ? Number(f.deviation) : 0
    return (<div key={s.id} className="card"><div className="row"><b>{s.order_index}. {s.name}</b>{open !== s.id && <Btn onClick={() => setOpen(s.id)}>{f ? 'Editar' : 'Lançar'}</Btn>}</div>
      {f ? <div style={{ fontSize: 14, color: 'var(--mu)', marginTop: 6 }}>Orçado {brl(Number(f.budget_total))} · Realizado {brl(Number(f.actual_total))}<br />Desvio <span style={{ color: d > 0 ? 'var(--bad)' : 'var(--ok)' }}>{d > 0 ? '+' : '−'}{brl(Math.abs(d))}</span>{f.consumed_percent != null && <> · {pct(Number(f.consumed_percent))} consumido</>}<br />Materiais {brl(Number(f.budget_materials))} / {brl(Number(f.actual_materials))} · Mão de obra {brl(Number(f.budget_labor))} / {brl(Number(f.actual_labor))}</div> : <div style={{ fontSize: 14, color: 'var(--mu)', marginTop: 6 }}>Sem lançamento financeiro.</div>}
      {open === s.id && <FinForm fin={f} busy={busy} onSave={i => save(s, i)} onCancel={() => setOpen(null)} />}</div>) })}{node}</>)
}
