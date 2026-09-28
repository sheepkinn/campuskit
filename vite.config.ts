import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'source',
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
