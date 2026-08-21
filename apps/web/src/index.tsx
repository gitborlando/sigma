import { limitConsoleMaxError } from '@gitborlando/utils/browser'
import { setupAPIImplements } from '@sigma/api'
import { cloudBaseServices } from '@sigma/cloudbase'
import { enablePatches } from 'immer'
import { configure } from 'mobx'
import { createRoot } from 'react-dom/client'
import 'reflect-metadata'
import { Global } from 'src/global'
import { App } from 'src/view/app'
import { GlobalContext } from 'src/view/hooks/use-services'

enablePatches()
limitConsoleMaxError({ enable: isDEV })
configure({ enforceActions: 'never' })

const global = Global.getInstance()
setupAPIImplements(global.container, cloudBaseServices)

createRoot(document.getElementById('root')!).render(
  <GlobalContext.Provider value={global}>
    <App />
  </GlobalContext.Provider>,
)
