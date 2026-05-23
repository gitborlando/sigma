import { createBrowserRouter, Navigate } from 'react-router'
import { EditorComp } from 'src/view/editor'
import { HomeComp } from 'src/view/pages/home'
import { Test } from 'src/view/pages/test'

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeComp />,
  },
  {
    path: '/fileId/:fileId',
    element: <EditorComp />,
  },
  {
    path: '*',
    element: <Navigate to='/' />,
  },
  {
    path: '/test',
    element: <Test />,
  },
])

export default router
