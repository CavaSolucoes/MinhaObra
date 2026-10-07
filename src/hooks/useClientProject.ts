import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import type { ClientProject } from '../types'
import { getClientProject } from '../services/clientPortalService'
export function useLoadClientProject(token: string) {
  const [data, setData] = useState<ClientProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setData(null); setError(null); getClientProject(token).then(setData).catch(e => setError(e instanceof Error ? e.message : 'Erro desconhecido')) }, [token])
  return { data, error }
}
export const useClientData = () => useOutletContext<ClientProject>()
export const useBasePath = () => `/obra/${useParams().token}`
