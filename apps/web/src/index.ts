import { enablePatches } from 'immer'
import { configure } from 'mobx'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import { setupConsoleLog } from 'src/utils/global'
import { App } from './view/app'

setupConsoleLog()
enablePatches()
configure({ enforceActions: 'never' })

ReactDOM.createRoot(document.getElementById('root')!).render(createElement(App))
