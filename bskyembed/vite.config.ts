import {resolve} from 'node:path'

import preact from '@preact/preset-vite'
import legacy from '@vitejs/plugin-legacy'
import type {UserConfig} from 'vite'
import paths from 'vite-tsconfig-paths'

const config: UserConfig = {
  plugins: [
    preact(),
    paths(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  resolve: {
    alias: {
      '@atproto/api': resolve(
        __dirname,
        '../../atproto/packages/api/dist/index.js',
      ),
      '@atproto/lexicon': resolve(
        __dirname,
        '../../atproto/packages/lexicon/dist/index.js',
      ),
      '@atproto/syntax': resolve(
        __dirname,
        '../../atproto/packages/syntax/dist/index.js',
      ),
    },
    preserveSymlinks: true,
  },
  build: {
    assetsDir: 'static',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        post: resolve(__dirname, 'post.html'),
      },
    },
  },
}

export default config
