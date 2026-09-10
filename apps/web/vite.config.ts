import vitePluginNestedAssets from '../../packages/nested-assets/src'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import reactXIf from 'vite-plugin-react-x-if'
import { autoImportConfig } from './auto-import'

export default defineConfig(() => {
  return {
    plugins: [
      vitePluginNestedAssets({ base: 'src/view/assets' }),
      autoImportConfig,
      react({
        babel: {
          plugins: [
            'babel-plugin-transform-typescript-metadata',
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-proposal-class-properties', { loose: true }],
          ],
        },
      }),
      reactXIf(),
    ],
    resolve: {
      alias: {
        src: path.resolve(__dirname, 'src'),
        types: path.resolve(__dirname, '../../types'),
      },
    },
    build: { commonjsOptions: { transformMixedEsModules: true } },
    server: { open: true },
  }
})
