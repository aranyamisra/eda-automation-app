import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Force use of esbuild instead of Rollup for better Vercel compatibility
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      // Disable native dependencies
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'plotly.js'],
          ui: ['@mui/material', '@mui/icons-material']
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'chart.js',
      'react-chartjs-2',
      'plotly.js',
      '@mui/material',
      '@mui/icons-material'
    ],
    exclude: []
  },
  // Force esbuild for better compatibility
  esbuild: {
    target: 'es2015'
  }
})