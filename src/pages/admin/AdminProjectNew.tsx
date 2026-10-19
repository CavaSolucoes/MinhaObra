import { Link, useNavigate } from 'react-router-dom'
import { createProject, setMainImage } from '../../services/adminApi'
import { ProjectForm } from '../../components/admin/ProjectForm'
import { useAct } from '../../components/admin/ui'
export default function AdminProjectNew() {
  const nav = useNavigate(), { act, busy, node } = useAct()
  return (<div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>
    <Link to="/admin" className="back" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12 }}>← Minhas obras</Link><h2>Nova obra</h2>
    <ProjectForm busy={busy} onCancel={() => nav('/admin')} onSubmit={(i, file) => act(async () => {
      const { id } = await createProject(i); let notice: string | undefined
      if (file) { try { await setMainImage(id, file, null) } catch (e) { notice = `Obra criada, mas a foto principal não foi enviada: ${(e as Error).message}. Envie-a novamente abaixo.` } }
      nav(`/admin/obra/${id}`, { state: { notice } })
    }, 'Obra criada')} />{node}
  </div>)
}
