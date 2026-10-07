import { useOutletContext } from 'react-router-dom'
import type { AdminCtx } from '../types/db'
export const useAdminProject = () => useOutletContext<AdminCtx>()
