import { limitConsoleMaxError } from '@gitborlando/utils/browser'
import { enablePatches } from 'immer'
import { configure } from 'mobx'
import { createRoot } from 'react-dom/client'
import 'reflect-metadata'
import { Global, setupCloudbaseAPI } from 'src/global'
import { App } from 'src/view/app'
import { GlobalContext } from 'src/view/hooks/use-services'

enablePatches()
limitConsoleMaxError({ enable: isDEV })
configure({ enforceActions: 'never' })

const global = Global.getInstance()
setupCloudbaseAPI(global.container)

createRoot(document.getElementById('root')!).render(
  <GlobalContext.Provider value={global}>
    <App />
  </GlobalContext.Provider>,
)
