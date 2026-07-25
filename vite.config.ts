import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // served from https://acqtom.github.io/accounting/ in production;
  // keep dev server at the root so `npm run dev` URLs don't change
  base: command === 'build' ? '/accounting/' : '/',
  plugins: [react()],
}))
