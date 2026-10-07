import { useNavigate } from 'react-router-dom'
import { useBasePath, useClientData } from '../../hooks/useClientProject'
import { ProgressCard } from '../../components/ProgressCard'
import { BudgetTrio } from '../../components/BudgetTrio'
import { ScheduleChart } from '../../components/ScheduleChart'
import { StageList } from '../../components/StageList'
export default function Overview() {
  const { project, stages, curve } = useClientData(), nav = useNavigate(), base = useBasePath()
  return (<>
    <div className="hero">Foto principal da obra</div>
    <ProgressCard project={project} /><BudgetTrio project={project} />
    <div className="card"><div className="lab" style={{ marginBottom: 8 }}>Cronograma · Planejado × Realizado</div><ScheduleChart curve={curve} /></div>
    <h3>STATUS POR ETAPA</h3>
    <StageList stages={stages} onSelect={s => nav(`${base}/cronograma?etapa=${s.id}`)} />
  </>)
}
