import fs from 'node:fs'
import {dirname, resolve} from 'node:path'

import preact from '@preact/preset-vite'
import legacy from '@vitejs/plugin-legacy'
import {fileURLToPath} from 'url'
import type {Plugin, UserConfig} from 'vite'
import paths from 'vite-tsconfig-paths'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * World's hackiest router, for dev only. Serves `/post.html` to requests that start with `/embed/`
 */
function devOnlyRouter(): Plugin {
  return {
    name: 'embed-to-post-html',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/embed/')) return next()

        const html = fs.readFileSync(
          resolve(process.cwd(), 'post.html'),
          'utf8',
        )

        server
          .transformIndexHtml(url, html)
          .then(transformed => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(transformed)
          })
          .catch(next)
      })
    },
  }
}

const config: UserConfig = {
  plugins: [
    preact(),
    paths(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    devOnlyRouter(),
  ],
  resolve: {
    alias: {
      '@atproto/api': resolve(
        __dirname,
        '../submodules/atproto/packages/api/dist',
      ),
      '@atproto/lexicon': resolve(
        __dirname,
        '../submodules/atproto/packages/lexicon/dist',
      ),
      '@atproto/syntax': resolve(
        __dirname,
        '../submodules/atproto/packages/syntax/dist',
      ),
      '@atproto/common-web': resolve(
        __dirname,
        '../submodules/atproto/packages/common-web/dist',
      ),
      '@atproto/xrpc': resolve(
        __dirname,
        '../submodules/atproto/packages/xrpc/dist',
      ),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    include: [
      '@atproto/api',
      '@atproto/lexicon',
      '@atproto/syntax',
      '@atproto/common-web',
      '@atproto/xrpc',
    ],
  },
  build: {
    assetsDir: 'static',
    commonjsOptions: {
      include: [/atproto/],
    },
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        post: resolve(__dirname, 'post.html'),
      },
    },
  },
}

export default config
