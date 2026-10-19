import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { validateImageFile } from '../src/utils/validate'
import { ProjectHero } from '../src/components/ProjectHero'
import { MainImageField } from '../src/components/admin/MainImageField'
import { mockClientProject as demo } from '../src/data/mockData'
test('validação da foto: tipo e tamanho', () => {
  assert.equal(validateImageFile({ type: 'image/jpeg', size: 1000 }), null); assert.equal(validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 }), null); assert.equal(validateImageFile({ type: 'image/webp', size: 10 }), null)
  assert.match(validateImageFile({ type: 'application/pdf', size: 10 })!, /JPG, PNG ou WebP/); assert.match(validateImageFile({ type: 'image/gif', size: 10 })!, /JPG, PNG ou WebP/); assert.match(validateImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })!, /5 MB/)
})
test('portal: sem foto cadastrada mostra estado vazio adequado', () => assert.ok(renderToStaticMarkup(h(ProjectHero, { project: { ...demo.project, mainImageUrl: null }, token: 'T' })).includes('Foto principal ainda não cadastrada')))
test('portal: com foto, enquanto a URL assinada carrega, não mostra texto de "sem foto"', () => assert.ok(!renderToStaticMarkup(h(ProjectHero, { project: { ...demo.project, mainImageUrl: 'p/principal/a.jpg' }, token: 'T' })).includes('ainda não cadastrada')))
test('admin: campo mostra "Sem foto principal" e a dica de formatos', () => { const html = renderToStaticMarkup(h(MainImageField, { currentPath: null, file: null, error: null, onFile: () => {} })); assert.ok(html.includes('Sem foto principal') && html.includes('até 5 MB')) })
