import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('thumbnails.js')) return 'thumbs';
          if (id.includes('/src/kit/') || id.includes('\\src\\kit\\')) return 'kit';
          if (id.includes('/src/stage/') || id.includes('\\src\\stage\\')) return 'stage';
        },
      },
    },
  },
});

