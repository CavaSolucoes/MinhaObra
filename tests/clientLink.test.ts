import test from 'node:test'
import assert from 'node:assert/strict'
import { clientLink } from '../src/utils/clientLink'
test('link do cliente respeita o subcaminho do GitHub Pages', () => {
  assert.equal(clientLink('8FJ29K', 'https://user.github.io', '/cavamais-portal/'), 'https://user.github.io/cavamais-portal/obra/8FJ29K')
  assert.equal(clientLink('8FJ29K', 'https://user.github.io', '/cavamais-portal'), 'https://user.github.io/cavamais-portal/obra/8FJ29K')
  assert.equal(clientLink('T', 'http://localhost:5173', '/'), 'http://localhost:5173/obra/T')
})
