import './app.css'
import './i18n/config'

import { preventDefault } from '@gitborlando/utils/browser'
import { QueryClientContext } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { UploaderComp } from 'src/view/component/uploader'
import { ContextMenuComp, ContextMenuContext } from 'src/view/features/context-menu'
import { ContextMenuState } from 'src/view/features/context-menu/context-menu'
import router from 'src/view/router'
import { queryClient } from './query'

export const App = observer(() => {
  const contextMenu = useMemo(() => new ContextMenuState(), [])
  return (
    <G onContextMenuCapture={preventDefault()}>
      <QueryClientContext.Provider value={queryClient}>
        <ContextMenuContext.Provider value={contextMenu}>
          <RouterProvider router={router} />
          <ContextMenuComp />
          <UploaderComp />
        </ContextMenuContext.Provider>
      </QueryClientContext.Provider>
    </G>
  )
})
