import { NavLink } from 'react-router-dom'
import { useBasePath } from '../hooks/useClientProject'
const tabs = [
  ['', 'Visão Geral', <path key="a" d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
  ['cronograma', 'Cronograma', <path key="a" d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 3v4M16 3v4M3 10h18" />],
  ['financeiro', 'Financeiro', <path key="a" d="M4 20V10M10 20V4M16 20v-8M22 20H2" />],
  ['fotos', 'Fotos', <g key="a"><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="12" cy="12.5" r="3.5" /></g>],
  ['documentos', 'Documentos', <path key="a" d="M6 3h8l5 5v13H6zM14 3v5h5" />],
] as const
export function BottomNavigation() {
  const base = useBasePath()
  return (
    <nav id="nav">
      {tabs.map(([path, label, icon]) => (
        <NavLink key={label} to={path ? `${base}/${path}` : base} end={!path} className={({ isActive }) => (isActive ? 'on' : '')}
          onClick={() => window.scrollTo(0, 0)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>{label}
        </NavLink>))}
    </nav>)
}
