// Verificacao contra o Supabase REAL. Uso: node --env-file=.env scripts/check-supabase.mjs
// Env extra (so no seu terminal, nunca no codigo): CHECK_ADMIN_EMAIL, CHECK_ADMIN_PASSWORD, CHECK_TOKEN (padrao 8FJ29K)
import { createClient } from '@supabase/supabase-js'
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key, CHECK_ADMIN_EMAIL: em, CHECK_ADMIN_PASSWORD: pw, CHECK_TOKEN: tk = '8FJ29K' } = process.env
if (!url || !key || !em || !pw) { console.error('Faltam: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CHECK_ADMIN_EMAIL, CHECK_ADMIN_PASSWORD'); process.exit(2) }
let fail = 0; const t = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); if (!c) fail++ }
const anon = createClient(url, key), adm = createClient(url, key)
// --- anonimo (cliente sem login)
const a1 = await anon.from('projects').select('id'); t('anon nao le projects', !a1.error && a1.data.length === 0)
const a2 = await anon.from('stage_financials').select('id'); t('anon nao le stage_financials', !a2.error && a2.data.length === 0)
const a3 = await anon.from('projects').insert({ name: 'x', client_name: 'x', location: 'x', start_date: '2026-01-01', planned_end_date: '2026-02-01' }); t('anon nao insere', !!a3.error)
const a4 = await anon.rpc('create_access_link', { p_project: '00000000-0000-0000-0000-000000000000' }); t('anon nao gera link', !!a4.error)
const r = await anon.rpc('get_client_project', { p_token: tk }); t('rpc com token valido', !r.error && r.data?.stages?.length > 0, `etapas=${r.data?.stages?.length}`)
t('rpc nao expoe client_name', r.data && !('client_name' in r.data.project))
const bad = await anon.rpc('get_client_project', { p_token: 'TOKEN-INEXISTENTE' }); t('rpc token invalido = null', !bad.error && bad.data === null)
// --- admin
const lg = await adm.auth.signInWithPassword({ email: em, password: pw }); t('admin login', !lg.error, lg.error?.message ?? '')
const ia = await adm.rpc('is_admin'); t('is_admin() = true', ia.data === true)
const p = await adm.from('projects').select('*'); t('admin le projects', !p.error && p.data.length > 0, `n=${p.data?.length}`)
const s = await adm.from('stages').select('order_index,name').order('order_index'); t('admin le stages (order_index)', !s.error && s.data.length > 0 && s.data.every((x, i, a) => !i || a[i - 1].order_index <= x.order_index))
const f = await adm.from('stage_financials').select('budget_total,actual_total'); const sum = (k) => f.data?.reduce((a, x) => a + Number(x[k]), 0)
t('admin le stage_financials', !f.error && f.data.length > 0, `orcado=${sum('budget_total')} realizado=${sum('actual_total')}`)
// --- cliente nunca altera, mesmo via RPC/token
const u = await anon.from('stage_financials').update({ actual_total: 1 }).neq('budget_total', -1).select(); t('anon nao altera financeiro', !u.error ? u.data.length === 0 : true)
const d = await anon.from('stages').delete().neq('order_index', -1).select(); t('anon nao apaga etapas', !d.error ? d.data.length === 0 : true)
await adm.auth.signOut(); console.log(fail ? `\n${fail} falha(s)` : '\nTudo OK'); process.exit(fail ? 1 : 0)
