import { useState, type CSSProperties } from 'react'
import type { MeasurementPoint, Stage } from '../types'
import { actualPoints, plannedCurve, pointLabel } from '../utils/measure'
const W = 340, H = 200, L = 34, R = 12, T = 12, B = 26, DAY = 86400000, MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
// Planejado × Realizado. Eixo = tempo real. Planejado: datas das etapas (pesos iguais). Realizado: um ponto por medição salva.
export function ScheduleChart({ project, stages, measurements }: { project: { startDate: string; plannedEndDate: string }; stages: Pick<Stage, 'plannedStart' | 'plannedEnd' | 'isPhysical'>[]; measurements: MeasurementPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  const planned = plannedCurve(stages), actual = actualPoints(measurements)
  if (!planned.length && !actual.length) return <div style={{ color: 'var(--mu)', fontSize: 14 }}>Cronograma ainda não disponível.</div>
  const all = [Date.parse(project.startDate), Date.parse(project.plannedEndDate) + DAY, ...planned.map(p => p.t), ...actual.map(p => p.t)]
  const t0 = Math.min(...all), t1 = Math.max(...all), x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R), y = (v: number) => T + (H - T - B) * (1 - v / 100)
  const ticks: { t: number; label: string }[] = []
  const d0 = new Date(t0), months = (new Date(t1).getUTCFullYear() - d0.getUTCFullYear()) * 12 + new Date(t1).getUTCMonth() - d0.getUTCMonth(), step = Math.max(1, Math.ceil(months / 5))
  for (let i = 1; i <= months; i += step) { const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + i, 1)); if (d.getTime() <= t1) ticks.push({ t: d.getTime(), label: `${MONTHS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}` }) }
  const line = (pts: { t: number; p: number }[]) => pts.map(p => `${x(p.t)},${y(p.p)}`).join(' ')
  const a = active !== null ? actual[active] : null
  return (<>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cronograma planejado versus realizado">
      {[0, 25, 50, 75, 100].map(v => (<g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#2a2a2e" /><text x={L - 6} y={y(v) + 4} fill="#8d8d93" fontSize="10" textAnchor="end">{v}%</text></g>))}
      {ticks.map(k => <g key={k.t}><line x1={x(k.t)} x2={x(k.t)} y1={T} y2={H - B} stroke="#1f1f23" /><text x={x(k.t)} y={H - 8} fill="#8d8d93" fontSize="10" textAnchor="middle">{k.label}</text></g>)}
      {planned.length > 1 && <polyline points={line(planned)} fill="none" stroke="#8d8d93" strokeWidth="2" strokeDasharray="5 4" />}
      {actual.length > 1 && <polyline points={line(actual)} fill="none" stroke="#c9a24b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {actual.map((p, i) => (<g key={p.id}>
        <circle data-point={p.date} cx={x(p.t)} cy={y(p.p)} r={i === actual.length - 1 ? 5.5 : 4.5} fill={active === i ? '#fff' : '#c9a24b'} stroke="#0e0e0f" strokeWidth="1.5"><title>{pointLabel(p.date, p.p)}</title></circle>
        <circle cx={x(p.t)} cy={y(p.p)} r="14" fill="transparent" tabIndex={0} role="button" aria-label={`Medição ${pointLabel(p.date, p.p)}`} style={{ cursor: 'pointer', outline: 'none' }} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} onFocus={() => setActive(i)} onMouseLeave={() => setActive(null)} />
      </g>))}
    </svg>
    <div className="lg"><span style={{ '--c': '#8d8d93' } as CSSProperties}>Planejado</span><span style={{ '--c': '#c9a24b' } as CSSProperties}>Realizado (medições)</span></div>
    <div style={{ color: a ? 'var(--gold)' : 'var(--mu)', fontSize: 14, marginTop: 8, minHeight: 20 }} aria-live="polite">
      {a ? `Medição de ${pointLabel(a.date, a.p)}` : actual.length === 0 ? 'Ainda não há medições registradas. A curva realizada aparece a partir da primeira medição.' : actual.length === 1 ? 'Há apenas 1 medição. São necessárias ao menos 2 medições para desenhar a curva realizada. Toque no ponto para ver o valor.' : 'Toque ou passe o cursor sobre um ponto para ver a data e o percentual.'}
    </div>
  </>)
}
