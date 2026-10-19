import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { validateReferenceDate, validateNotes, NOTES_MAX } from '../src/utils/validate'
import { ReferenceDateField } from '../src/components/admin/ReferenceDateField'
const TODAY = '2026-10-16'
test('data de referência: mínimo 01/01/2000 e máximo hoje, ambos inclusivos', () => {
  assert.equal(validateReferenceDate('2000-01-01', TODAY), null)
  assert.equal(validateReferenceDate(TODAY, TODAY), null)
  assert.equal(validateReferenceDate('2026-10-15', TODAY), null)
  assert.match(validateReferenceDate('1999-12-31', TODAY)!, /anterior a 01\/01\/2000/)
  assert.match(validateReferenceDate('2026-10-17', TODAY)!, /futura/)
  assert.match(validateReferenceDate('2099-01-01', TODAY)!, /futura/)
  assert.match(validateReferenceDate('', TODAY)!, /válida/); assert.match(validateReferenceDate('2026-13-45', TODAY)!, /válida/); assert.match(validateReferenceDate('275760-01-01', TODAY)!, /válida/)
})
test('observações: até 5.000 caracteres', () => { assert.equal(NOTES_MAX, 5000); assert.equal(validateNotes('x'.repeat(5000)), null); assert.match(validateNotes('x'.repeat(5001))!, /5000 caracteres/); assert.equal(validateNotes(''), null) })
test('campo de data: calendário limitado (min = 2000-01-01, max = hoje) e erro visível para data futura', () => {
  const ok = renderToStaticMarkup(h(ReferenceDateField, { value: TODAY, onChange: () => {}, today: TODAY }))
  assert.ok(ok.includes('min="2000-01-01"') && ok.includes(`max="${TODAY}"`) && ok.includes('não pode ser futura') && !ok.includes('aria-invalid="true"'))
  const fut = renderToStaticMarkup(h(ReferenceDateField, { value: '2026-10-17', onChange: () => {}, today: TODAY }))
  assert.ok(fut.includes('aria-invalid="true"') && fut.includes('A data de referência não pode ser futura.'))
  assert.ok(renderToStaticMarkup(h(ReferenceDateField, { value: '1999-12-31', onChange: () => {}, today: TODAY })).includes('anterior a 01/01/2000'))
})
