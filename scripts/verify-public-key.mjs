// Falha se faltar variável ou se a "anon key" for na verdade uma chave privada. Uso: node scripts/verify-public-key.mjs (ou npm run check:key com .env)
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = process.env
const die = m => { console.error('FAIL ' + m); process.exit(1) }
if (!url || !key) die('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) die('VITE_SUPABASE_URL deve ser https://<ref>.supabase.co')
if (key.startsWith('sb_secret_')) die('Essa é uma chave SECRETA (sb_secret_). Use somente a anon/publishable.')
if (key.startsWith('eyJ')) { let role; try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { die('JWT ilegível.') } if (role !== 'anon') die(`A chave tem role "${role}". Só "anon" pode ir para o frontend.`) }
console.log('OK  URL e chave pública (anon) válidas.')
