import type { Project } from '../types'
export function ProjectHeader({ project }: { project: Project }) {
  return (<>
    <div className="hd"><div><div className="logo">CAVA<b>+</b></div><div className="sub">SOLUÇÕES EM ENGENHARIA</div></div><div className="thumb" /></div>
    <div className="pn">{project.name}</div><div className="loc">📍 {project.location}</div>
  </>)
}
