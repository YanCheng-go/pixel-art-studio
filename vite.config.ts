import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use a configurable base path so the same app can build for GitHub Pages.
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
})
