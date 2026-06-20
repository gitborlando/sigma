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
      color: [['default', 'Color']],
      'auto-bind': [['default', 'autoBind']],
      '@linaria/core': ['css', 'cx'],
      '@gitborlando/signal': ['Signal'],
      '@gitborlando/geo': ['AABB', 'OBB', 'XY', 'Angle'],
      '@gitborlando/toolkit/disposer': ['Disposer'],
      'src/view/assets/assets': ['Assets'],
      'src/view/component/grid': ['Grid', 'G', 'C'],
      'src/view/component/lucide': ['Lucide'],
      'src/editor/math': ['Matrix', 'MRect', 'max', 'min'],
      'src/editor/handle/select': ['HandleSelect'],
      'src/editor/y-state/y-state': ['YState'],
      'src/editor/y-state/y-clients': ['YClients'],
      'src/editor/editor/undo-service': ['Undo'],
      'src/utils/common': ['T', 'isDEV', 'isPROD'],
      'src/utils/color': ['COLOR'],
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
      from: 'src/editor/math',
      imports: ['IMatrix'],
      type: true,
    },
    {
      from: '@gitborlando/geo',
      imports: ['IXY'],
      type: true,
    },
  ],
})
