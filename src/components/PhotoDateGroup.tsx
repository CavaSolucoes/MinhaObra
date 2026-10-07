import type { Media } from '../types'
import { fmtLong } from '../utils/format'
import { thumbBg } from '../utils/media'
export function PhotoDateGroup({ date, items, onOpen }: { date: string; items: Media[]; onOpen: (index: number) => void }) {
  const videos = items.filter(m => m.type === 'video').length, photos = items.length - videos, extra = items.length - 6
  return (
    <div className="card">
      <button className="dg" onClick={() => onOpen(0)}>
        <div className="row"><b>{fmtLong(date).toUpperCase()}</b></div>
        <span>{photos} foto{photos !== 1 ? 's' : ''}{videos ? ` • ${videos} vídeo${videos > 1 ? 's' : ''}` : ''}</span>
      </button>
      <div className="grid" style={{ marginTop: 12 }}>
        {items.slice(0, 6).map((m, i) => {
          const more = extra > 0 && i === 5
          return <button key={m.id} className={`ph ${more ? 'more' : ''}`} style={{ background: thumbBg(m.thumbHue, i) }} onClick={() => onOpen(i)}>{more ? `+${extra + 1}` : m.type === 'video' ? '▶' : ''}</button>
        })}
      </div>
    </div>)
}
