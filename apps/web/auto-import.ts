import path from 'path'
import autoImportPlugin from 'unplugin-auto-import/vite'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const autoImportConfig = autoImportPlugin({
  dts: path.resolve(dirname, 'auto-imports.d.ts'),
  imports: [
    'react',
    'react-router',
    'mobx',
    'mobx-react-lite',
    'react-i18next',
    {
      yjs: [['*', 'Y']],
      'auto-bind': [['default', 'autoBind']],
      'first-di': ['reflection'],
      '@linaria/core': ['css', 'cx'],
      '@gitborlando/geo': ['AABB', 'OBB', 'XY', 'Angle'],
      'src/view/assets/assets': ['Assets'],
      'src/view/component/grid': ['Grid', 'G', 'C'],
      'src/utils/common': ['T', 'isDEV', 'isPROD'],
      'src/view/styles/styles': ['styles'],
      'src/view/styles/classes': ['classes'],
      'src/view/i18n/config': ['t'],
    },
    {
      from: 'react',
      imports: ['FC', 'ReactNode', 'ComponentPropsWithRef'],
      type: true,
    },
    {
      from: '@gitborlando/geo',
      imports: ['IXY'],
      type: true,
    },
  ],
})
