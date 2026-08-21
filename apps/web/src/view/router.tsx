import { createBrowserRouter, Navigate } from 'react-router'
import { EditorComp } from 'src/view/editor'
import { HomeComp } from 'src/view/pages/home'

const router = createBrowserRouter([
  { path: '/', element: <HomeComp /> },
  { path: '/fileId/:fileId', element: <EditorComp /> },
  { path: '*', element: <Navigate to='/' /> },
])

export default router
