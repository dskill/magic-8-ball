import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
