import { useEffect, useState } from 'react'
import type { Project } from '../types'
import { getClientFileUrl } from '../services/clientFilesService'
// Foto principal no portal do cliente. Bucket privado: a URL assinada é pedida à Edge Function (token) e expira.
export function ProjectHero({ project, token }: { project: Project; token: string }) {
  const path = project.mainImageUrl, [url, setUrl] = useState<string | null>(null), [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true; setUrl(null); setFailed(false)
    if (!path) return
    if (/^https?:/i.test(path)) { setUrl(path); return }
    getClientFileUrl(token, 'project_image', project.id).then(u => live && setUrl(u)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [path, token, project.id])
  if (url) return <div className="hero" role="img" aria-label={`Foto de ${project.name}`} style={{ background: `url("${url}") center / cover no-repeat` }} onError={() => setFailed(true)} />
  return <div className="hero">{!path ? 'Foto principal ainda não cadastrada' : failed ? 'Não foi possível carregar a foto' : ''}</div>
}
