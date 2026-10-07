import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Base path do deploy. Ordem: VITE_BASE explícito > GitHub Actions (nome REAL do repositório, ex.: /MinhaObra/) > "/" (desenvolvimento local).
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.VITE_BASE || (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/')
export default defineConfig({ base: base.endsWith('/') ? base : `${base}/`, plugins: [react()] })
