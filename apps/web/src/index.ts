import { limitConsoleMaxError } from '@gitborlando/utils/browser'
import { enablePatches } from 'immer'
import { configure } from 'mobx'
import { createElement } from 'react'
import ReactDOM from 'react-dom/client'
import 'reflect-metadata'
import { App } from './view/app'

enablePatches()
limitConsoleMaxError({ enable: isDEV })
configure({ enforceActions: 'never' })

ReactDOM.createRoot(document.getElementById('root')!).render(createElement(App))
