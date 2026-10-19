import { useEffect, useState } from 'react'
import { signedUrl } from '../../services/adminApi'
import { Field, Input } from './ui'
// Foto principal: pré-visualiza a nova imagem escolhida ou a atual (URL assinada, bucket privado).
export function MainImageField({ currentPath, file, error, onFile }: { currentPath: string | null; file: File | null; error: string | null; onFile: (f: File | null) => void }) {
  const [cur, setCur] = useState<string | null>(null), [preview, setPreview] = useState<string | null>(null), [curErr, setCurErr] = useState(false)
  useEffect(() => {
    let live = true; setCur(null); setCurErr(false)
    if (!currentPath) return
    if (/^https?:/i.test(currentPath)) { setCur(currentPath); return }
    signedUrl('photos', currentPath, 600).then(u => live && setCur(u)).catch(() => live && setCurErr(true))
    return () => { live = false }
  }, [currentPath])
  useEffect(() => { if (!file) { setPreview(null); return } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u) }, [file])
  const src = preview ?? cur
  return (<Field label="Foto principal" hint="JPG, PNG ou WebP, até 5 MB. Aparece na Visão Geral do cliente.">
    <div style={{ height: 150, borderRadius: 14, border: '1px solid var(--line)', marginTop: 6, overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--mu)', fontSize: 14 }}>
      {src ? <img src={src} alt="Foto principal da obra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : curErr ? 'Não foi possível carregar a foto atual.' : currentPath ? 'Carregando…' : 'Sem foto principal'}
    </div>
    <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => onFile(e.target.files?.[0] ?? null)} />
    {file && <small style={{ color: 'var(--gold)' }}>{currentPath ? 'A foto atual será substituída ao salvar.' : 'A foto será enviada ao salvar.'}</small>}
    {error && <small style={{ color: 'var(--bad)', display: 'block' }}>{error}</small>}
  </Field>)
}
