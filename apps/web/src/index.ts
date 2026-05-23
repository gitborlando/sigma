import { enablePatches } from 'immer'
import { configure } from 'mobx'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './view/app'

enablePatches()
configure({ enforceActions: 'never' })

ReactDOM.createRoot(document.getElementById('root')!).render(createElement(App))
