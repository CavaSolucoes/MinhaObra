import { useState, type FormEvent } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { createStage, deleteStage, swapStages, updateStage, type StageInput } from '../../../services/adminApi'
import type { StageRow } from '../../../types/db'
import { Btn, Field, FormError, Input, useAct } from '../../../components/admin/ui'
import { fmtDate } from '../../../utils/format'
import { physicalPatch } from '../../../utils/measure'
import { cssVar, isLate, stageColor, stageLabel, stageState } from '../../../utils/stage'
import { toNum, validateStage } from '../../../utils/validate'
export function StageForm({ initial, busy, supported, onSave, onCancel }: { initial?: StageRow; busy: boolean; supported: boolean; onSave: (i: StageInput) => void; onCancel: () => void }) {
  const [physical, setPhysical] = useState(initial?.is_physical ?? true)   // padrão: física (nada é classificado automaticamente)
  const [f, setF] = useState({ name: initial?.name ?? '', planned_start: initial?.planned_start ?? '', planned_end: initial?.planned_end ?? '', planned_percent: String(initial?.planned_percent ?? 0), actual_percent: String(initial?.actual_percent ?? 0) })
  const [err, setErr] = useState<string | null>(null), set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const submit = (e: FormEvent) => { e.preventDefault(); const m = validateStage(f); setErr(m); if (!m) onSave({ name: f.name.trim(), planned_start: f.planned_start, planned_end: f.planned_end, planned_percent: toNum(f.planned_percent), actual_percent: toNum(f.actual_percent), ...physicalPatch(supported, initial, physical) }) }
  return (<form className="card" onSubmit={submit}>
    <Field label="Nome da etapa"><Input value={f.name} onChange={set('name')} /></Field>
    <div className="kv"><Field label="Início"><Input type="date" value={f.planned_start} onChange={set('planned_start')} /></Field><Field label="Fim"><Input type="date" value={f.planned_end} onChange={set('planned_end')} /></Field>
      <Field label="Planejado (%)"><Input type="number" min={0} max={100} step="any" inputMode="decimal" value={f.planned_percent} onChange={set('planned_percent')} /></Field><Field label="Realizado (%)"><Input type="number" min={0} max={100} step="any" inputMode="decimal" value={f.actual_percent} onChange={set('actual_percent')} /></Field></div>
    {supported && <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14 }}>
      <input type="checkbox" checked={physical} onChange={e => setPhysical(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2 }} />
      <span>Etapa física<small style={{ display: 'block', color: 'var(--mu)' }}>Desmarque para itens apenas orçamentários (ex.: Lucro presumido). Eles continuam no orçamento e no Financeiro, mas ficam fora das medições, do avanço e do cronograma do cliente. Medições já salvas não mudam.</small></span></label>}
    <p style={{ color: 'var(--mu)', fontSize: 13 }}>O status (não iniciado / em andamento / concluído) vem do percentual executado; "Atrasado" é a situação de prazo (executado abaixo do planejado).</p><FormError msg={err} />
    <div className="row" style={{ marginTop: 12 }}><Btn type="submit" disabled={busy} style={{ flex: 1 }}>Salvar</Btn><Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn></div></form>)
}
export default function ProjectSchedule() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct(), [edit, setEdit] = useState<string | null>(null), supported = data.stages.some(s => s.is_physical !== undefined)   // false antes da migration 005
  const stages = [...data.stages].sort((a, b) => a.order_index - b.order_index), max = stages.reduce((m, s) => Math.max(m, s.order_index), 0)
  const save = (id: string, i: StageInput) => act(async () => { if (id === 'new') await createStage(data.project.id, { ...i, order_index: max + 1 }); else await updateStage(id, i); await reload(); setEdit(null) }, 'Etapa salva')
  const move = (i: number, d: -1 | 1) => { const a = stages[i], b = stages[i + d]; if (b) act(async () => { await swapStages(a, b, max + 1000); await reload() }, 'Ordem atualizada') }
  const del = (s: StageRow) => { if (window.confirm(`Excluir a etapa "${s.name}"?\nO financeiro dessa etapa também será excluído; fotos ligadas a ela ficam sem etapa.`)) act(async () => { await deleteStage(s.id); await reload() }, 'Etapa excluída') }
  return (<>
    <p style={{ color: 'var(--mu)', fontSize: 13, margin: '0 0 12px' }}>O percentual executado é atualizado pela medição mais recente (aba Medições). Uma edição manual aqui vale até a próxima medição.</p>
    {stages.map((s, i) => edit === s.id ? <StageForm key={s.id} initial={s} busy={busy} supported={supported} onSave={x => save(s.id, x)} onCancel={() => setEdit(null)} /> : (
      <div key={s.id} className="card" style={cssVar(stageColor[stageState({ actualPercent: Number(s.actual_percent) })])}>
        <div className="row"><b>{s.order_index}. {s.name}</b><span style={{ display: 'flex', gap: 6 }}><span className="badge">{stageLabel({ actualPercent: Number(s.actual_percent) })}</span>{s.is_physical === false && <span className="badge" style={cssVar('#8d8d93')}>Item orçamentário</span>}{isLate({ actualPercent: Number(s.actual_percent), plannedPercent: Number(s.planned_percent) }) && <span className="badge" style={cssVar(stageColor.bad)}>Atrasado</span>}</span></div>
        <div style={{ color: 'var(--mu)', fontSize: 14, margin: '4px 0 10px' }}>{fmtDate(s.planned_start)} → {fmtDate(s.planned_end)} · planejado {s.planned_percent}% · realizado {s.actual_percent}%</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start' }}><Btn disabled={busy || i === 0} onClick={() => move(i, -1)}>↑</Btn><Btn disabled={busy || i === stages.length - 1} onClick={() => move(i, 1)}>↓</Btn><Btn onClick={() => setEdit(s.id)}>Editar</Btn><Btn danger disabled={busy} onClick={() => del(s)}>Excluir</Btn></div></div>))}
    {edit === 'new' ? <StageForm busy={busy} supported={supported} onSave={x => save('new', x)} onCancel={() => setEdit(null)} /> : <Btn style={{ width: '100%' }} onClick={() => setEdit('new')}>+ Nova etapa</Btn>}{node}
  </>)
}
