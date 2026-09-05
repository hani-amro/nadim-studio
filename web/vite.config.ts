import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the built site works from a subfolder or a file server.
  base: './',
  plugins: [react(), tailwindcss()],
  // No source maps in the published build: they were 4.34 MB of a 6.1 MB
  // dist, i.e. most of what a visitor downloaded was the site's own source.
  build: { outDir: 'dist', sourcemap: false },
})
