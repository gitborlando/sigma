import autoImportPlugin from 'unplugin-auto-import/vite'

export const autoImportConfig = autoImportPlugin({
  imports: [
    'react',
    'react-router',
    'mobx',
    'mobx-react-lite',
    'react-i18next',
    {
      color: [['default', 'Color']],
      'auto-bind': [['default', 'autoBind']],
      '@linaria/core': ['css', 'cx'],
      '@gitborlando/signal': ['Signal'],
      'src/view/assets/assets': ['Assets'],
      'src/view/component/grid': ['Grid', 'G', 'C'],
      'src/view/component/lucide': ['Lucide'],
      'src/editor/math': [
        'AABB',
        'OBB',
        'XY',
        'Angle',
        'Matrix',
        'MRect',
        'max',
        'min',
      ],
      'src/editor/y-state/y-state': ['YState'],
      'src/editor/y-state/y-clients': ['YClients'],
      'src/editor/y-state/y-undo': ['YUndo'],
      'src/utils/global': ['T'],
      'src/utils/color': ['COLOR'],
      'src/view/styles/styles': ['styles'],
      'src/view/styles/classes': ['classes'],
      'src/utils/disposer': ['Disposer'],
      'src/view/i18n/config': ['t', 'sentence'],
    },
    {
      from: 'react',
      imports: ['FC', 'ReactNode', 'ComponentPropsWithRef'],
      type: true,
    },
    {
      from: 'src/editor/math',
      imports: ['IXY'],
      type: true,
    },
  ],
})
