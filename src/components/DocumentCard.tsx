import type { ProjectDocument } from '../types'
import { fmtDate } from '../utils/format'
export function DocumentCard({ doc, busy, onView, onDownload }: { doc: ProjectDocument; busy: boolean; onView: () => void; onDownload: () => void }) {
  return (
    <div className="card doc"><div className="ic">{doc.fileType.toUpperCase()}</div>
      <div className="n"><b>{doc.name}</b><small>{doc.category} · {fmtDate(doc.date)}</small></div>
      <button className="btn" disabled={busy} onClick={onView}>Ver</button><button className="btn" disabled={busy} onClick={onDownload}>Baixar</button>
    </div>)
}
