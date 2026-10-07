import { useClientData, useBasePath } from '../../hooks/useClientProject'
import { FinancialSummary } from '../../components/FinancialSummary'
import { FinancialStageCard } from '../../components/FinancialStageCard'
export default function Financial() {
  const { project, stages, financials } = useClientData(), base = useBasePath()
  return (<>
    <h2>Resumo financeiro</h2><FinancialSummary project={project} />
    <h3>GASTOS POR ETAPA</h3>
    {stages.map(s => { const f = financials.find(x => x.stageId === s.id); return f && <FinancialStageCard key={s.id} stage={s} fin={f} to={`${base}/financeiro/${s.id}`} /> })}
  </>)
}
