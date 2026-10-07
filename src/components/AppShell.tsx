import { Outlet } from 'react-router-dom'
import type { ClientProject } from '../types'
import { ProjectHeader } from './ProjectHeader'
import { BottomNavigation } from './BottomNavigation'
export function AppShell({ data }: { data: ClientProject }) {
  return (<>
    <div id="app"><main><ProjectHeader project={data.project} /><Outlet context={data} /></main></div>
    <BottomNavigation />
  </>)
}
