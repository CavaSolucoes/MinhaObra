import { useNavigate, useParams } from 'react-router-dom'
import { overallProgress, physicalOnly } from '../../utils/measure'
import { ProjectHero } from '../../components/ProjectHero'
import { useBasePath, useClientData } from '../../hooks/useClientProject'
import { ProgressCard } from '../../components/ProgressCard'
import { BudgetTrio } from '../../components/BudgetTrio'
import { ScheduleChart } from '../../components/ScheduleChart'
import { StageList } from '../../components/StageList'
export default function Overview() {
  const { project, stages, measurements } = useClientData(), nav = useNavigate(), base = useBasePath(), { token = '' } = useParams()
  return (<>
    <ProjectHero project={project} token={token} />
    <ProgressCard project={project} progress={overallProgress(stages, measurements)} /><BudgetTrio project={project} />
    <div className="card"><div className="lab" style={{ marginBottom: 8 }}>Cronograma · Planejado × Realizado</div><ScheduleChart project={project} stages={stages} measurements={measurements} /></div>
    <h3>STATUS POR ETAPA</h3>
    <StageList stages={physicalOnly(stages)} onSelect={s => nav(`${base}/cronograma?etapa=${s.id}`)} />
  </>)
}
