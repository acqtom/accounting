import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this from the /accounting/ subpath, so the build
  // needs that base for asset URLs to resolve. Vercel (and `npm run dev`)
  // serve from the domain root, where a non-'/' base 404s every asset and
  // renders a blank page — Vercel sets the VERCEL env var during its build,
  // so we can tell the two production targets apart.
  base: command === 'build' && !process.env.VERCEL ? '/accounting/' : '/',
  plugins: [react()],
  build: {
    // the bundle is a few hundred KB over Vite's default 500kb warning
    // threshold; that's just a heads-up about load time, not a build
    // error, and this app is small enough that code-splitting isn't
    // worth the complexity yet. Raising the limit stops the noisy warning.
    chunkSizeWarningLimit: 1000,
  },
}))
