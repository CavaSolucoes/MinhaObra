import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { physicalOnly } from '../../utils/measure'
import { useClientData } from '../../hooks/useClientProject'
import { ScheduleChart } from '../../components/ScheduleChart'
import { StageCard } from '../../components/StageCard'
import { StageDetailSheet } from '../../components/StageDetailSheet'
export default function Schedule() {
  const { project, stages, measurements } = useClientData(), shown = physicalOnly(stages)   // itens orçamentários não aparecem no cronograma
  const [view, setView] = useState<'planned' | 'stage'>('planned')
  const [params, setParams] = useSearchParams()
  const selected = shown.find(s => s.id === params.get('etapa'))
  return (<>
    <h2>Cronograma da obra</h2>
    <div className="tabs">
      <button className={`chip ${view === 'planned' ? 'on' : ''}`} onClick={() => setView('planned')}>Planejado × Realizado</button>
      <button className={`chip ${view === 'stage' ? 'on' : ''}`} onClick={() => setView('stage')}>Por etapa</button>
    </div>
    {view === 'planned' && <div className="card"><ScheduleChart project={project} stages={stages} measurements={measurements} /></div>}
    <h3>ETAPAS DA OBRA</h3>
    {shown.map(s => <StageCard key={s.id} stage={s} onSelect={x => setParams({ etapa: x.id })} />)}
    {selected && <StageDetailSheet stage={selected} onClose={() => setParams({})} />}
  </>)
}
