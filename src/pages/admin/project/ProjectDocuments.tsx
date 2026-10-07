import { useState } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { deleteDocument, signedUrl, uploadDocument } from '../../../services/adminApi'
import type { DocumentCategory } from '../../../types'
import type { DocRow } from '../../../types/db'
import { Btn, Field, Input, Select, useAct } from '../../../components/admin/ui'
import { fmtDate } from '../../../utils/format'
import { fmtSize } from '../../../utils/validate'
const CATS: DocumentCategory[] = ['Projetos', 'Notas fiscais', 'Medições', 'ART/RRT', 'Contratos', 'Outros']
export default function ProjectDocuments() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct()
  const [file, setFile] = useState<File | null>(null), [cat, setCat] = useState<DocumentCategory>('Projetos'), [name, setName] = useState(''), [key, setKey] = useState(0)
  const send = () => act(async () => { if (!file) return; await uploadDocument(data.project.id, { file, category: cat, name: name.trim() || file.name }); setFile(null); setName(''); setKey(key + 1); await reload() }, 'Documento enviado')
  const view = (d: DocRow) => { const w = window.open('', '_blank'); act(async () => { try { const u = await signedUrl('documents', d.storage_path); if (w) w.location.href = u; else window.location.href = u } catch (e) { w?.close(); throw e } }, '') }
  const download = (d: DocRow) => act(async () => { window.location.assign(await signedUrl('documents', d.storage_path, 300, d.name)) }, '')
  const del = (d: DocRow) => { if (window.confirm(`Excluir "${d.name}"?`)) act(async () => { await deleteDocument(d); await reload() }, 'Documento excluído') }
  return (<>
    <div className="card"><div className="lab">Enviar documento</div>
      <Field label="Categoria"><Select value={cat} onChange={e => setCat(e.target.value as DocumentCategory)}>{CATS.map(c => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Nome (opcional)" hint="Se vazio, usa o nome do arquivo."><Input value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Arquivo"><Input key={key} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>
      <Btn style={{ width: '100%', marginTop: 14 }} disabled={busy || !file} onClick={send}>{busy ? 'Enviando…' : 'Enviar'}</Btn></div>
    {data.docs.map(d => <div key={d.id} className="card"><b style={{ overflowWrap: 'anywhere' }}>{d.name}</b><div style={{ color: 'var(--mu)', fontSize: 14, margin: '4px 0 10px' }}>{d.category} · {fmtDate(d.created_at.slice(0, 10))} · {fmtSize(d.file_size)}</div>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}><Btn disabled={busy} onClick={() => view(d)}>Ver</Btn><Btn disabled={busy} onClick={() => download(d)}>Baixar</Btn><Btn danger disabled={busy} onClick={() => del(d)}>Excluir</Btn></div></div>)}
    {!data.docs.length && <div className="card" style={{ color: 'var(--mu)' }}>Nenhum documento enviado.</div>}{node}</>)
}
