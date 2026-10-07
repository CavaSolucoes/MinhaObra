import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useClientData } from '../../hooks/useClientProject'
import { FilterTabs } from '../../components/FilterTabs'
import { DocumentCard } from '../../components/DocumentCard'
import { getClientFileUrl } from '../../services/clientFilesService'
import type { ProjectDocument } from '../../types'
const FILTERS = ['Todos', 'Projetos', 'Notas fiscais', 'Medições', 'ART/RRT', 'Contratos', 'Outros']
export default function Documents() {
  const { documents } = useClientData(), { token = '' } = useParams()
  const [filter, setFilter] = useState('Todos'), [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null)
  const list = documents.filter(d => filter === 'Todos' || d.category === filter)
  // Ver: abre em nova aba (a aba é aberta no clique para não ser barrada pelo navegador). Baixar: URL com download.
  const open = async (d: ProjectDocument, download: boolean) => {
    setBusy(d.id); setErr(null)
    const w = download ? null : window.open('', '_blank')
    try {
      const url = await getClientFileUrl(token, 'document', d.id, download)
      if (w) { w.opener = null; w.location.href = url } else window.location.assign(url)
    } catch (e) { w?.close(); setErr(e instanceof Error ? e.message : 'Erro ao abrir o documento.'); setTimeout(() => setErr(null), 6000) } finally { setBusy(null) }
  }
  return (<>
    <h2>Documentos</h2><FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
    {list.length ? list.map(d => <DocumentCard key={d.id} doc={d} busy={busy === d.id} onView={() => open(d, false)} onDownload={() => open(d, true)} />) : <div className="card" style={{ color: 'var(--mu)' }}>Nenhum documento nesta categoria.</div>}
    {err && <div className="toast" style={{ background: 'var(--bad)', color: '#fff', maxWidth: '92%' }}>{err}</div>}
  </>)
}
