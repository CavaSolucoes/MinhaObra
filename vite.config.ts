import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// VITE_BASE só é definido no deploy (GitHub Pages: /cavamais-portal/). Em desenvolvimento local o padrão é "/".
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()] })
