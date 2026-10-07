import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { ProjectAdminRow } from '../../types/db'
import type { ProjectInput } from '../../services/adminApi'
import { validateProject } from '../../utils/validate'
import { Btn, Field, FormError, Input, Select } from './ui'
export const PROJECT_STATUS: [string, string][] = [['planejamento', 'Planejamento'], ['em_andamento', 'Em andamento'], ['concluida', 'Concluída'], ['pausada', 'Pausada']]
export function ProjectForm({ initial, busy, onSubmit, onCancel }: { initial?: ProjectAdminRow; busy: boolean; onSubmit: (i: ProjectInput) => void; onCancel?: () => void }) {
  const [f, setF] = useState({ name: initial?.name ?? '', client_name: initial?.client_name ?? '', location: initial?.location ?? '', address: initial?.address ?? '', start_date: initial?.start_date ?? '', planned_end_date: initial?.planned_end_date ?? '', status: initial?.status ?? 'em_andamento' })
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const submit = (e: FormEvent) => { e.preventDefault(); const m = validateProject(f); setErr(m); if (!m) onSubmit({ ...f, name: f.name.trim(), client_name: f.client_name.trim(), location: f.location.trim(), address: f.address.trim() || null }) }
  return (
    <form className="card" onSubmit={submit}>
      <Field label="Nome da obra"><Input value={f.name} onChange={set('name')} /></Field>
      <Field label="Cliente" hint="Uso interno da CAVA+. Não aparece no portal do cliente."><Input value={f.client_name} onChange={set('client_name')} /></Field>
      <Field label="Localização"><Input value={f.location} onChange={set('location')} placeholder="Ex.: Eusébio - CE" /></Field>
      <Field label="Endereço (opcional)"><Input value={f.address} onChange={set('address')} /></Field>
      <div className="kv"><Field label="Início"><Input type="date" value={f.start_date} onChange={set('start_date')} /></Field><Field label="Término previsto"><Input type="date" value={f.planned_end_date} onChange={set('planned_end_date')} /></Field></div>
      <Field label="Status"><Select value={f.status} onChange={set('status')}>{PROJECT_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
      <FormError msg={err} />
      <div className="row" style={{ marginTop: 16 }}><Btn type="submit" disabled={busy} style={{ flex: 1 }}>{busy ? 'Salvando…' : 'Salvar'}</Btn>{onCancel && <Btn onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>}</div>
    </form>)
}
