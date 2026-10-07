// Verificação contra o Supabase REAL (Edge Function client-file-url já implantada).
// Uso: npm run check:files  (lê .env). Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CHECK_TOKEN (token de uma obra com mídia/documento),
// CHECK_ADMIN_EMAIL, CHECK_ADMIN_PASSWORD (para achar arquivo de OUTRA obra). Opcional: CHECK_ALLOW_TEMP_UPLOAD=true (admin sobe e apaga 1 arquivo temporário).
import { createClient } from '@supabase/supabase-js'
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key, CHECK_TOKEN: tk, CHECK_ADMIN_EMAIL: em, CHECK_ADMIN_PASSWORD: pw, CHECK_ALLOW_TEMP_UPLOAD: tmp } = process.env
if (!url || !key || !tk) { console.error('Faltam: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CHECK_TOKEN'); process.exit(2) }
let fail = 0; const t = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); if (!c) fail++ }; const skip = (n, why) => console.log(`SKIP  ${n} (${why})`)
const anon = createClient(url, key), adm = createClient(url, key)
const call = body => fetch(`${url}/functions/v1/client-file-url`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(body) })
const { data: p, error } = await anon.rpc('get_client_project', { p_token: tk }); t('portal: get_client_project com o token', !error && !!p)
const photo = p?.media?.find(m => m.media_type === 'photo'), video = p?.media?.find(m => m.media_type === 'video'), doc = p?.documents?.[0]
for (const [n, kind, it] of [['foto', 'media', photo], ['vídeo', 'media', video], ['documento', 'document', doc]]) {
  if (!it) { skip(`${n} da mesma obra`, 'a obra não tem esse tipo'); continue }
  const r = await call({ token: tk, kind, id: it.id }), j = await r.json().catch(() => ({}))
  t(`${n}: Edge Function devolve URL`, r.status === 200 && typeof j.url === 'string', `status=${r.status}`)
  if (!j.url) continue
  t(`${n}: resposta só tem url + expires_in`, Object.keys(j).sort().join() === 'expires_in,url')
  t(`${n}: é signed URL com expiração`, j.url.includes('/object/sign/') && j.url.includes('token=') && j.expires_in > 0 && j.expires_in <= 1800, `expires_in=${j.expires_in}s`)
  const g = await fetch(j.url, { headers: { Range: 'bytes=0-0' } }); t(`${n}: arquivo abre pela URL assinada`, g.status === 200 || g.status === 206, `status=${g.status}`)
  const bare = await fetch(j.url.split('?')[0]); t(`${n}: sem o token a URL não abre`, bare.status >= 400)
}
const bad = await call({ token: 'TOKEN-INEXISTENTE-123', kind: 'document', id: doc?.id ?? '00000000-0000-4000-8000-000000000001' }); t('token inválido → 401', bad.status === 401, `status=${bad.status}`)
if (em && process.env.CHECK_ADMIN_PASSWORD) {
  const lg = await adm.auth.signInWithPassword({ email: em, password: pw }); t('admin login', !lg.error)
  const [m, d] = await Promise.all([adm.from('media').select('id,project_id'), adm.from('documents').select('id,project_id')]), other = [...(m.data ?? []).map(x => ['media', x]), ...(d.data ?? []).map(x => ['document', x])].find(([, x]) => x.project_id !== p?.project?.id)
  if (other) { const r = await call({ token: tk, kind: other[0], id: other[1].id }); t('arquivo de OUTRA obra → 404 (sem URL)', r.status === 404 && !(await r.text()).includes('url'), `status=${r.status}`) } else skip('arquivo de outra obra', 'só existe uma obra com arquivos')
  if (tmp === 'true' && p?.project?.id) { const path = `${p.project.id}/outros/__check-${Date.now()}.txt`, up = await adm.storage.from('documents').upload(path, new Blob(['check'])); t('admin consegue fazer upload', !up.error, up.error?.message ?? ''); if (!up.error) await adm.storage.from('documents').remove([path]) } else skip('upload do admin', 'defina CHECK_ALLOW_TEMP_UPLOAD=true')
} else skip('testes com admin', 'defina CHECK_ADMIN_EMAIL/PASSWORD')
for (const b of ['photos', 'videos', 'documents']) {
  const l = await anon.storage.from(b).list('', { limit: 5 }); t(`anon não lista o bucket ${b}`, !!l.error || (l.data ?? []).length === 0)
  const pub = await fetch(`${url}/storage/v1/object/public/${b}/qualquer.jpg`); t(`bucket ${b} não é público`, pub.status >= 400)
}
const up = await anon.storage.from('documents').upload(`check-anon/${Date.now()}.txt`, new Blob(['x'])); t('anon não faz upload', !!up.error)
console.log(fail ? `\n${fail} falha(s)` : '\nTudo OK'); process.exit(fail ? 1 : 0)
