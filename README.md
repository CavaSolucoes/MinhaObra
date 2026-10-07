# CAVA+ — Portal de Acompanhamento de Obras

Frontend React + Vite + TypeScript (admin em `/admin`, cliente em `/obra/:token`). Backend: Supabase (já configurado; não faz parte deste repositório, exceto a Edge Function em `supabase/functions`).

## Rodar localmente
```
npm install
copy .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (somente a chave anon/pública)
npm run dev
```
Testes: `npm test` · Tipos: `npx tsc --noEmit` · Build: `npm run build`

## Publicação (GitHub Pages)
Workflow: `.github/workflows/deploy.yml`. Em *Settings → Secrets and variables → Actions* crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores públicos), e em *Settings → Pages* use **Source: GitHub Actions**.
**Nunca** coloque a `service_role` aqui: ela existe apenas dentro da Edge Function, no Supabase.
