import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Inline JS + CSS into index.html so the packaged Electron app (which loads over
// file://) has nothing to fetch. ES-module <script> tags are always fetched in
// CORS mode, which file:// (null origin) blocks → blank screen. Inlining avoids
// the fetch entirely. See the blank-screen fix.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { outDir: 'dist' }
})
