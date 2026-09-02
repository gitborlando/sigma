import './app.css'

import { preventDefault } from '@gitborlando/utils/browser'
import { QueryClientContext } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { UploaderComp } from 'src/view/component/uploader'
import router from 'src/view/router'
import './i18n/config'
import { queryClient } from './query'

export const App = observer(() => {
  return (
    <G onContextMenuCapture={preventDefault()}>
      <QueryClientContext.Provider value={queryClient}>
        <UploaderComp />
        <RouterProvider router={router} />
      </QueryClientContext.Provider>
    </G>
  )
})
