import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()], base: process.env.APP_BASE || './',
  build: {target: ['safari17', 'chrome110', 'firefox115'], sourcemap: false},
});
