import { Service } from '@gitborlando/di-service'
import autoBind from 'auto-bind'
import { createContext } from 'react'

export class HomeState extends Service {
  constructor() {
    super()
    autoBind(makeObservable(this))
  }

  @observable loginDialogOpened = false
}

export const HomeStateContext = createContext<HomeState>(null!)

export const useHomeState = () => useContext(HomeStateContext)
