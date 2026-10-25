import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    viteSingleFile()
  ],
  test: {
    environment: 'node',
    globals: true
  }
});
