import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
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
          'jsbarcode': ['jsbarcode']
        }
      }
    }
  }
})
