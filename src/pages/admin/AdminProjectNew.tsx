import { Link, useNavigate } from 'react-router-dom'
import { createProject } from '../../services/adminApi'
import { ProjectForm } from '../../components/admin/ProjectForm'
import { useAct } from '../../components/admin/ui'
export default function AdminProjectNew() {
  const nav = useNavigate(), { act, busy, node } = useAct()
  return (<div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>
    <Link to="/admin" className="back" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}>← Minhas obras</Link><h2>Nova obra</h2>
    <ProjectForm busy={busy} onCancel={() => nav('/admin')} onSubmit={i => act(async () => { const { id } = await createProject(i); nav(`/admin/obra/${id}`) }, 'Obra criada')} />{node}
  </div>)
}
