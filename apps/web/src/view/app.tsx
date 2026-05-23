import './app.css'

import { preventDefault } from '@gitborlando/utils/browser'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { Query } from 'src/global/sdk/query'
import { ContextMenuComp } from 'src/view/component/context-menu'
import { UploaderComp } from 'src/view/component/uploader'
import router from 'src/view/router'
import './i18n/config'

export const App = observer(() => {
  return (
    <G onContextMenuCapture={preventDefault()}>
      <QueryClientProvider client={Query}>
        <ContextMenuComp />
        <UploaderComp />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </G>
  )
})
