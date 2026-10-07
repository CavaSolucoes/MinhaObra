import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getClientFileUrl } from '../../services/clientFilesService'
import { useClientData } from '../../hooks/useClientProject'
import { FilterTabs } from '../../components/FilterTabs'
import { PhotoDateGroup } from '../../components/PhotoDateGroup'
import { PhotoGallery } from '../../components/PhotoGallery'
import { groupByDate } from '../../utils/media'
const FILTERS = ['Todos', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamentos']
export default function Photos() {
  const { stages, media } = useClientData(), { token = '' } = useParams()
  const [filter, setFilter] = useState('Todos')
  const [open, setOpen] = useState<{ date: string; index: number } | null>(null)
  const stageName = (id: string | null) => stages.find(s => s.id === id)?.name ?? ''
  const groups = groupByDate(media.filter(m => filter === 'Todos' || stageName(m.stageId) === filter))
  const openItems = open ? groups.find(([d]) => d === open.date)?.[1] : undefined
  return (<>
    <h2>Fotos</h2><FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
    {groups.length ? groups.map(([date, items]) => <PhotoDateGroup key={date} date={date} items={items} onOpen={i => setOpen({ date, index: i })} />)
      : <div className="card" style={{ color: 'var(--mu)' }}>Nenhuma mídia nesta etapa.</div>}
    {open && openItems && <PhotoGallery items={openItems} index={open.index} stageName={stageName(openItems[open.index].stageId)} fetchUrl={m => getClientFileUrl(token, 'media', m.id)} onChange={i => setOpen({ ...open, index: i })} onClose={() => setOpen(null)} />}
  </>)
}
