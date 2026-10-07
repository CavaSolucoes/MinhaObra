import { Link, Navigate, useParams } from 'react-router-dom'
import { useBasePath, useClientData } from '../../hooks/useClientProject'
import { FinancialDetail } from '../../components/FinancialDetail'
export default function FinancialDetailPage() {
  const { stages, financials } = useClientData(), { stageId } = useParams(), base = useBasePath()
  const stage = stages.find(s => s.id === stageId), fin = financials.find(f => f.stageId === stageId)
  if (!stage || !fin) return <Navigate to={`${base}/financeiro`} replace />
  return (<><Link className="back" to={`${base}/financeiro`} style={{ display: 'inline-block', textDecoration: 'none' }}>← Resumo financeiro</Link><FinancialDetail stage={stage} fin={fin} /></>)
}
