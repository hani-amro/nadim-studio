import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the built site works from a subfolder or a file server.
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', sourcemap: true },
})
