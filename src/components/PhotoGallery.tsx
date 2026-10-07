import { useEffect, useState } from 'react'
import type { Media } from '../types'
import { fmtLong } from '../utils/format'
// Foto/vídeo carregados por URL assinada (fetchUrl). Vídeo: player nativo, sem autoplay e sem download forçado.
export function PhotoGallery({ items, index, stageName, fetchUrl, onChange, onClose }: { items: Media[]; index: number; stageName: string; fetchUrl: (m: Media) => Promise<string>; onChange: (i: number) => void; onClose: () => void }) {
  const m = items[index], n = items.length
  const [st, setSt] = useState<{ url?: string; error?: string } | null>(null), [retry, setRetry] = useState(0)
  useEffect(() => {
    let live = true; setSt(null)
    fetchUrl(m).then(url => live && setSt({ url })).catch(e => live && setSt({ error: e instanceof Error ? e.message : 'Erro ao abrir o arquivo.' }))
    return () => { live = false }
  }, [m.id, retry]) // eslint-disable-line react-hooks/exhaustive-deps
  const box = { maxWidth: '100%', maxHeight: '100%' } as const
  return (
    <div className="lb">
      <div className="top"><span>{fmtLong(m.date)}</span><button onClick={onClose} style={{ color: 'var(--gold)' }}>Fechar</button></div>
      <div className="stage" style={{ background: `linear-gradient(135deg,hsl(${m.thumbHue},18%,22%),hsl(${m.thumbHue},10%,10%))`, minHeight: 0, overflow: 'hidden' }}>
        {st?.url ? (m.type === 'video' ? <video key={m.id} src={st.url} controls playsInline preload="metadata" style={box} /> : <img key={m.id} src={st.url} alt={m.caption ?? ''} style={box} />)
          : st?.error ? <div style={{ fontSize: 15, textAlign: 'center', padding: 16 }}>{st.error}<br /><button className="btn" style={{ marginTop: 12 }} onClick={() => setRetry(retry + 1)}>Tentar novamente</button></div>
          : <span style={{ fontSize: 15, color: 'var(--mu)' }}>Carregando…</span>}
      </div>
      <div className="cap"><small>{stageName} · {index + 1}/{n}{m.type === 'video' ? ' · vídeo' : ''}</small>{m.caption && `“${m.caption}”`}</div>
      <div className="nv"><button onClick={() => onChange((index - 1 + n) % n)}>← Anterior</button><button onClick={() => onChange((index + 1) % n)}>Próxima →</button></div>
    </div>)
}
