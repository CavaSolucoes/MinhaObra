import { MIN_REFERENCE_DATE, todayLocal, validateReferenceDate } from '../../utils/validate'
import { Field, Input } from './ui'
// Campo de data da medição: o calendário já bloqueia datas futuras (max = hoje) e anteriores a 2000 (min); a validação reforça se o valor for digitado.
export function ReferenceDateField({ value, onChange, today = todayLocal() }: { value: string; onChange: (v: string) => void; today?: string }) {
  const err = value ? validateReferenceDate(value, today) : null
  return (<Field label="Data de referência" hint="De 01/01/2000 até hoje (não pode ser futura).">
    <Input type="date" min={MIN_REFERENCE_DATE} max={today} value={value} onChange={e => onChange(e.target.value)} aria-invalid={!!err} />
    {err && <small style={{ color: 'var(--bad)', display: 'block' }}>{err}</small>}
  </Field>)
}
