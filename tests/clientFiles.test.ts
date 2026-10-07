import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { Outlet, Route, Routes } from 'react-router-dom'
import { handle, TTL, type ClientPayload, type Deps } from '../supabase/functions/client-file-url/handler'
import { createClientFiles } from '../src/services/clientFilesService'
import { fromRpc } from '../src/services/mappers'
import { mockClientProject as demo } from '../src/data/mockData'
import Photos from '../src/pages/client/Photos'
import Documents from '../src/pages/client/Documents'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const A: ClientPayload = { media: [{ id: id(1), media_type: 'photo', storage_path: 'projA/2026-09-12/a.jpg' }, { id: id(2), media_type: 'video', storage_path: 'projA/2026-09-12/a.mp4' }], documents: [{ id: id(3), name: 'Projeto A.pdf', storage_path: 'projA/projetos/a.pdf' }] }
const B: ClientPayload = { media: [{ id: id(11), media_type: 'photo', storage_path: 'projB/2026-09-12/b.jpg' }], documents: [{ id: id(13), name: 'Contrato B.pdf', storage_path: 'projB/contratos/b.pdf' }] }
function world(fail = false) {
  const signed: { bucket: string; path: string; ttl: number; name?: string }[] = []
  const deps: Deps = {
    getClientProject: async t => { if (fail) throw new Error('db down'); return t === 'TOKEN-A' ? A : t === 'TOKEN-B' ? B : null },
    signUrl: async (bucket, path, ttl, name) => { signed.push({ bucket, path, ttl, name }); return `https://x.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=jwt` },
  }
  const call = (b: unknown, method = 'POST') => handle(new Request('http://f/', { method, body: method === 'POST' ? JSON.stringify(b) : undefined }), deps)
  return { signed, call }
}

test('1 token válido + foto da mesma obra → permitido (bucket photos, retorna só url + expires_in)', async () => {
  const { call, signed } = world(), r = await call({ token: 'TOKEN-A', kind: 'media', id: id(1) }), j = await r.json()
  assert.equal(r.status, 200); assert.deepEqual(Object.keys(j).sort(), ['expires_in', 'url']); assert.equal(signed[0].bucket, 'photos'); assert.equal(signed[0].path, 'projA/2026-09-12/a.jpg')
})
test('2 token válido + vídeo da mesma obra → permitido (bucket videos)', async () => {
  const { call, signed } = world(), r = await call({ token: 'TOKEN-A', kind: 'media', id: id(2) })
  assert.equal(r.status, 200); assert.equal(signed[0].bucket, 'videos')
})
test('3 token válido + documento da mesma obra → permitido; download só quando pedido', async () => {
  const { call, signed } = world()
  assert.equal((await call({ token: 'TOKEN-A', kind: 'document', id: id(3) })).status, 200)
  assert.equal((await call({ token: 'TOKEN-A', kind: 'document', id: id(3), download: true })).status, 200)
  assert.deepEqual(signed.map(s => [s.bucket, s.name]), [['documents', undefined], ['documents', 'Projeto A.pdf']])
})
test('4 token inválido → 401 e nenhuma URL gerada; formato inválido → 400', async () => {
  const { call, signed } = world(), r = await call({ token: 'TOKEN-ZZZ', kind: 'media', id: id(1) })
  assert.equal(r.status, 401); assert.deepEqual(await r.json(), { error: 'invalid_token' })
  for (const bad of [{ token: 'x', kind: 'media', id: id(1) }, { token: 'TOKEN-A', kind: 'media', id: 'nao-uuid' }, { token: 'TOKEN-A', kind: 'bucket', id: id(1) }, { token: "A'; drop", kind: 'media', id: id(1) }]) assert.equal((await call(bad)).status, 400)
  assert.equal(signed.length, 0)
})
test('5 token válido + arquivo de OUTRA obra / inexistente → 404 idêntico, sem URL', async () => {
  const { call, signed } = world(), out: string[] = []
  for (const b of [{ token: 'TOKEN-A', kind: 'media', id: id(11) }, { token: 'TOKEN-A', kind: 'document', id: id(13) }, { token: 'TOKEN-A', kind: 'media', id: id(99) }, { token: 'TOKEN-A', kind: 'document', id: id(1) }]) { const r = await call(b); assert.equal(r.status, 404); out.push(JSON.stringify(await r.json())) }
  assert.equal(new Set(out).size, 1); assert.equal(signed.length, 0)
  assert.equal((await call({ token: 'TOKEN-B', kind: 'media', id: id(11) })).status, 200) // a obra B acessa o que é dela
})
test('8 validade curta e resposta sem dados internos', async () => {
  const { call } = world()
  for (const [kind, i, ttl] of [['media', 1, TTL.photo], ['media', 2, TTL.video], ['document', 3, TTL.document]] as const) {
    const t = await (await call({ token: 'TOKEN-A', kind, id: id(i) })).text(); const j = JSON.parse(t)
    assert.equal(j.expires_in, ttl); assert.ok(ttl > 0 && ttl <= 1800); assert.ok(!/projA|storage_path|bucket|project_id/.test(t.replace(j.url, '')))
  }
})
test('falha do backend → 502; método errado → 405; preflight CORS → 204', async () => {
  assert.equal((await world(true).call({ token: 'TOKEN-A', kind: 'media', id: id(1) })).status, 502)
  assert.equal((await world().call({}, 'GET')).status, 405)
  const o = await world().call(null, 'OPTIONS'); assert.equal(o.status, 204); assert.ok(o.headers.get('access-control-allow-headers')?.includes('authorization'))
})

test('front: erros do backend viram mensagens claras; cache evita nova chamada e expira', async () => {
  let calls = 0, t = 0, mode: 'ok' | 401 | 404 = 'ok'
  const get = createClientFiles(async () => { calls++; return mode === 'ok' ? { data: { url: `https://u/${calls}`, expires_in: 600 }, error: null } : { data: null, error: { context: { status: mode } } } }, () => t)
  assert.equal(await get('TOKEN-A', 'media', id(1)), 'https://u/1'); assert.equal(await get('TOKEN-A', 'media', id(1)), 'https://u/1'); assert.equal(calls, 1)
  assert.equal(await get('TOKEN-A', 'document', id(3), true), 'https://u/2') // download é outra URL
  t = 560_000; assert.equal(await get('TOKEN-A', 'media', id(1)), 'https://u/3') // faltando <1 min → renova
  mode = 401; await assert.rejects(get('T', 'media', id(5)), /Link inválido/); mode = 404; await assert.rejects(get('T', 'media', id(6)), /Arquivo não encontrado/)
})

const empty = { ...demo, media: [], documents: [] }
const page = (el: ReturnType<typeof h>) => renderToStaticMarkup(h(StaticRouter, { location: '/obra/TOKEN-A' }, h(Routes, null, h(Route, { path: '/obra/:token', element: h(Outlet, { context: empty }) }, h(Route, { index: true, element: el })))))
test('10 portal funciona sem mídias nem documentos', () => {
  assert.ok(page(h(Photos)).includes('Nenhuma mídia')); assert.ok(page(h(Documents)).includes('Nenhum documento'))
  const r = fromRpc({ project: { id: 'p', name: 'n', location: 'l', address: null, main_image_url: null, start_date: '2026-01-01', planned_end_date: '2026-12-31', status: 'em_andamento' }, stages: [], media: [], documents: [] })
  assert.deepEqual([r.media, r.documents], [[], []])
})
test('portal com documentos exibe Ver/Baixar', () => {
  const html = renderToStaticMarkup(h(StaticRouter, { location: '/obra/TOKEN-A' }, h(Routes, null, h(Route, { path: '/obra/:token', element: h(Outlet, { context: demo }) }, h(Route, { index: true, element: h(Documents) })))))
  assert.ok(html.includes('Ver') && html.includes('Baixar') && html.includes('Contrato.pdf'))
})
