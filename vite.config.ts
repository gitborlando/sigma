import { miniId } from '@gitborlando/utils'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import wywInJs from '@wyw-in-js/vite'
import path from 'path'
import { defineConfig } from 'vite'
import reactXIf from 'vite-plugin-react-x-if'
import { autoImportConfig } from './auto-import'

export default defineConfig(() => {
  return {
    plugins: [
      autoImportConfig,
      wywInJs({
        include: 'src/**/*.tsx',
        classNameSlug: () => miniId(5),
      }),
      react(),
      reactXIf(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        src: path.resolve(__dirname, 'src'),
        types: path.resolve(__dirname, 'types'),
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    server: {
      open: true,
    },
  }
})
