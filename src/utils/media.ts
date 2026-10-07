import type { Media } from '../types'
export const groupByDate = (list: Media[]): [string, Media[]][] => {
  const m = new Map<string, Media[]>()
  ;[...list].sort((a, b) => b.date.localeCompare(a.date)).forEach(x => m.set(x.date, [...(m.get(x.date) ?? []), x]))
  return [...m.entries()]
}
export const thumbBg = (hue: number, i: number) => `linear-gradient(${135 + i * 20}deg,hsl(${hue},18%,22%),hsl(${hue},10%,12%))`
