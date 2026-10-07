import type { CSSProperties } from 'react'
import type { ScheduleCurve } from '../types'
const W = 340, H = 190, L = 30, B = 24, T = 10, R = 8
export function ScheduleChart({ curve }: { curve: ScheduleCurve }) {
  const n = curve.months.length
  if (n < 2) return <div style={{ color: 'var(--mu)', fontSize: 14 }}>Cronograma ainda não disponível.</div>
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1)
  const y = (v: number) => T + (H - T - B) * (1 - v / 100)
  const pts = (a: (number | null)[]) => a.flatMap((v, i) => (v === null ? [] : [`${x(i)},${y(v)}`])).join(' ')
  const last = curve.actual.reduce<number>((m, v, i) => (v === null ? m : i), -1)
  return (<>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cronograma planejado versus realizado">
      {[0, 25, 50, 75, 100].map(v => (<g key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#2a2a2e" />
        <text x={L - 6} y={y(v) + 4} fill="#8d8d93" fontSize="10" textAnchor="end">{v}%</text></g>))}
      {curve.months.map((m, i) => i % 2 === 0 && <text key={m} x={x(i)} y={H - 6} fill="#8d8d93" fontSize="10" textAnchor="middle">{m}</text>)}
      <polyline points={pts(curve.planned)} fill="none" stroke="#8d8d93" strokeWidth="2" strokeDasharray="5 4" />
      <polyline points={pts(curve.actual)} fill="none" stroke="#c9a24b" strokeWidth="3" strokeLinejoin="round" />
      {last >= 0 && <circle cx={x(last)} cy={y(curve.actual[last] as number)} r="5" fill="#c9a24b" />}
    </svg>
    <div className="lg"><span style={{ '--c': '#8d8d93' } as CSSProperties}>Planejado</span><span style={{ '--c': '#c9a24b' } as CSSProperties}>Realizado</span></div>
  </>)
}
