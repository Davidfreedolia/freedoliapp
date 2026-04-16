import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Strip console.log / console.info from production bundles.
  // console.error and console.warn are kept (used for error reporting).
  esbuild: command === 'build'
    ? { pure: ['console.log', 'console.info'], drop: ['debugger'] }
    : {},
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Supabase
          'supabase': ['@supabase/supabase-js'],

          // PDF generation
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],

          // Image generation
          'html2canvas': ['html2canvas'],

          // ZIP handling
          'jszip': ['jszip'],

          // Barcode
          'jsbarcode': ['jsbarcode'],
        }
      }
    }
  }
}))
