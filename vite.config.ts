/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site is served from https://<user>.github.io/calculAIR/
// so the build must use that repository name as the base path.
export default defineConfig({
  plugins: [react()],
  base: '/calculAIR/',
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
