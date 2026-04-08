import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte({ preprocess: sveltePreprocess() })],
  base: './',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
});