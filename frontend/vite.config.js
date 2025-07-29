import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'plotly.js'],
          ui: ['@mui/material', '@mui/icons-material']
        }
      }
    },
    // Optimize for Vercel
    target: 'es2015',
    minify: 'terser',
    sourcemap: false
  },
  // Handle potential native module issues
  optimizeDeps: {
    exclude: ['chartjs-chart-box-and-violin-plot']
  }
})
