const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const brl = (v: number) => 'R$ ' + v.toLocaleString('pt-BR')
export const pct = (v: number) => v.toFixed(1).replace('.', ',') + '%'
export const fmtDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
export const fmtShort = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}` }
export const fmtLong = (d: string) => { const [y, m, day] = d.split('-'); return `${day} de ${MONTHS[+m - 1]} de ${y}` }
