import { useEffect, useState } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { deleteMedia, signedUrls, uploadMedia } from '../../../services/adminApi'
import type { MediaRow } from '../../../types/db'
import { Btn, Field, Input, Select, useAct } from '../../../components/admin/ui'
import { fmtLong } from '../../../utils/format'
import { isDate, todayLocal } from '../../../utils/validate'
const fill = { width: '100%', height: '100%', objectFit: 'cover' } as const
const Thumb = ({ m, src }: { m: MediaRow; src?: string }) => !src ? <span>…</span> : m.media_type === 'video' ? <video src={src} muted preload="metadata" style={fill} /> : <img src={src} alt={m.caption ?? ''} loading="lazy" style={fill} />
export default function ProjectMedia() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct()
  const [files, setFiles] = useState<File[]>([]), [date, setDate] = useState(todayLocal()), [stageId, setStageId] = useState(''), [caption, setCaption] = useState(''), [prog, setProg] = useState(''), [key, setKey] = useState(0)
  const [urls, setUrls] = useState<Record<string, string>>({}), [urlErr, setUrlErr] = useState<string | null>(null), [open, setOpen] = useState<MediaRow | null>(null)
  useEffect(() => {
    let live = true; const p = (t: string) => data.media.filter(m => m.media_type === t).map(m => m.storage_path)
    Promise.all([signedUrls('photos', p('photo')), signedUrls('videos', p('video'))]).then(([a, b]) => live && (setUrls({ ...a, ...b }), setUrlErr(null))).catch(e => live && setUrlErr(e.message))
    return () => { live = false }
  }, [data.media])
  const stageName = (id: string | null) => data.stages.find(s => s.id === id)?.name ?? 'Sem etapa'
  const send = () => act(async () => {
    if (!isDate(date)) throw new Error('Data inválida.')
    const bad: string[] = []
    for (let i = 0; i < files.length; i++) { setProg(`Enviando ${i + 1} de ${files.length}…`); try { await uploadMedia(data.project.id, { file: files[i], date, stageId: stageId || null, caption: caption.trim() || null }) } catch (e) { bad.push(`${files[i].name}: ${(e as Error).message}`) } }
    setProg(''); setFiles([]); setKey(key + 1); await reload(); if (bad.length) throw new Error('Falhas: ' + bad.join(' | '))
  }, `${files.length} arquivo(s) enviado(s)`)
  const del = (m: MediaRow) => { if (window.confirm('Excluir esta mídia? O arquivo será apagado.')) act(async () => { await deleteMedia(m); setOpen(null); await reload() }, 'Mídia excluída') }
  const days = [...new Set(data.media.map(m => m.media_date))].sort().reverse()
  return (<>
    <div className="card"><div className="lab">Enviar fotos e vídeos</div>
      <Field label="Data"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Etapa (opcional)"><Select value={stageId} onChange={e => setStageId(e.target.value)}><option value="">Sem etapa</option>{[...data.stages].sort((a, b) => a.order_index - b.order_index).map(s => <option key={s.id} value={s.id}>{s.order_index}. {s.name}</option>)}</Select></Field>
      <Field label="Legenda (opcional)"><Input value={caption} onChange={e => setCaption(e.target.value)} /></Field>
      <Field label="Arquivos"><Input key={key} type="file" multiple accept="image/*,video/*" onChange={e => setFiles(Array.from(e.target.files ?? []))} /></Field>
      <Btn style={{ width: '100%', marginTop: 14 }} disabled={busy || !files.length} onClick={send}>{prog || `Enviar ${files.length || ''} arquivo(s)`}</Btn></div>
    {urlErr && <div className="card" style={{ color: 'var(--bad)' }}>Não foi possível gerar links das mídias: {urlErr}</div>}
    {days.map(d => <div key={d} className="card"><b style={{ fontSize: 14, letterSpacing: 1 }}>{fmtLong(d).toUpperCase()}</b>
      <div className="grid" style={{ marginTop: 10 }}>{data.media.filter(m => m.media_date === d).map(m => <button key={m.id} className="ph" style={{ overflow: 'hidden' }} onClick={() => setOpen(m)}><Thumb m={m} src={urls[m.storage_path]} />{m.media_type === 'video' && <span style={{ position: 'absolute' }}>▶</span>}</button>)}</div></div>)}
    {!days.length && <div className="card" style={{ color: 'var(--mu)' }}>Nenhuma foto ou vídeo enviado.</div>}
    {open && <div className="lb"><div className="top"><span>{fmtLong(open.media_date)}</span><button onClick={() => setOpen(null)} style={{ color: 'var(--gold)' }}>Fechar</button></div>
      <div className="stage" style={{ minHeight: 0, overflow: 'hidden' }}>{urls[open.storage_path] ? (open.media_type === 'video' ? <video src={urls[open.storage_path]} controls playsInline style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <img src={urls[open.storage_path]} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />) : '…'}</div>
      <div className="cap"><small>{stageName(open.stage_id)}</small>{open.caption}</div><div className="nv"><Btn danger style={{ flex: 1 }} disabled={busy} onClick={() => del(open)}>Excluir</Btn></div></div>}
    {node}</>)
}
