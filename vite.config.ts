import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, the CMS API and uploads come from the live site, so `npm run dev` shows real content.
// (Editing only works on the live site itself — the API refuses requests from other origins.)
const live = process.env.CMS_ORIGIN ?? 'https://lorenzo-reimann.com'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: live, changeOrigin: true, secure: true },
      '/uploads': { target: live, changeOrigin: true, secure: true },
    },
  },
  build: { target: 'es2022' }, // top-level await in main.tsx
})
