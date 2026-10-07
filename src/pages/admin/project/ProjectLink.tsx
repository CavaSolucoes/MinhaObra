import { useState } from 'react'
import { useAdminProject } from '../../../hooks/useAdminProject'
import { createAccessLink, setAccessActive } from '../../../services/adminApi'
import { Btn, useAct } from '../../../components/admin/ui'
import { fmtDate } from '../../../utils/format'
import { clientLink } from '../../../utils/clientLink'
export default function ProjectLink() {
  const { data, reload } = useAdminProject(), { act, busy, node } = useAct(), [fresh, setFresh] = useState<string | null>(null)
  const url = fresh ? clientLink(fresh) : ''
  const gen = () => act(async () => { setFresh(await createAccessLink(data.project.id)); await reload() }, 'Link gerado')
  const copy = () => act(async () => { await navigator.clipboard.writeText(url) }, 'Link copiado')
  const toggle = (id: string, active: boolean) => { if (!active || window.confirm('Desativar este link? Quem o usa perderá o acesso.')) act(async () => { await setAccessActive(id, active); await reload() }, active ? 'Link reativado' : 'Link desativado') }
  return (<>
    <div className="card"><div className="lab">Novo link do cliente</div>
      <p style={{ color: 'var(--mu)', fontSize: 14 }}>O link só é exibido uma vez, logo após ser gerado: o sistema guarda apenas um hash. Gerar um novo link <b>não</b> desativa os anteriores.</p>
      <Btn style={{ width: '100%' }} disabled={busy} onClick={gen}>Gerar novo link</Btn>
      {fresh && <div style={{ marginTop: 14 }}><div className="lab">Link (copie agora)</div><div style={{ overflowWrap: 'anywhere', margin: '6px 0 10px', color: 'var(--gold)' }}>{url}</div><Btn style={{ width: '100%' }} onClick={copy}>Copiar</Btn></div>}</div>
    <h3>LINKS DESTA OBRA</h3>
    {data.access.map(a => <div key={a.id} className="card row" style={{ alignItems: 'center' }}><div><b style={{ color: a.active ? 'var(--ok)' : 'var(--mu)' }}>{a.active ? 'Ativo' : 'Desativado'}</b><div style={{ color: 'var(--mu)', fontSize: 14 }}>Criado em {fmtDate(a.created_at.slice(0, 10))}</div></div><Btn danger={a.active} disabled={busy} onClick={() => toggle(a.id, !a.active)}>{a.active ? 'Desativar' : 'Reativar'}</Btn></div>)}
    {!data.access.length && <div className="card" style={{ color: 'var(--mu)' }}>Nenhum link gerado.</div>}{node}</>)
}
