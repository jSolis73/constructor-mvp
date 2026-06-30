import { defineConfig, transformWithEsbuild } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    {
      name: 'univerjs-transform',
      enforce: 'pre',
      async transform(code, id) {
        if (id.includes('/node_modules/@univerjs/') && id.endsWith('.js')) {
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
            jsxImportSource: 'react',
          })
        }
      },
    },
    react(),
  ],
  optimizeDeps: {
    force: true,
    include: [
      // @univerjs — each package separately so esbuild splits them into smaller chunks
      '@univerjs/presets',
      '@univerjs/preset-sheets-core',
      '@univerjs/core',
      '@univerjs/sheets',
      '@univerjs/sheets-ui',
      '@univerjs/ui',
      '@univerjs/docs',
      '@univerjs/docs-ui',
      '@univerjs/engine-render',
      '@univerjs/engine-formula',
      '@univerjs/sheets-formula',
      '@univerjs/sheets-formula-ui',
      '@univerjs/sheets-numfmt',
      '@univerjs/sheets-numfmt-ui',
      '@univerjs/network',
      '@univerjs/rpc',
      '@univerjs/themes',
      // @univerjs sub-paths used directly
      '@univerjs/presets/preset-sheets-core',
      '@univerjs/core/lib/facade',
      '@univerjs/sheets/facade',
      // CJS deps of @univerjs
      'async-lock',
      'fast-diff',
      'franc-min',
      'localforage',
      'loose-envify',
      'ot-json1',
      'prop-types',
      'uuid',
      'cjk-regex',
      // other deps
      'rxjs',
      'rxjs/operators',
      'exceljs',
    ],
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  },
  build: {
    commonjsOptions: {
      include: [/exceljs/, /node_modules/],
    },
  },
})
