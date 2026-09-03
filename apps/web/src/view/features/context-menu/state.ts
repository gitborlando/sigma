import { Service } from '@gitborlando/di-service'
import { AnyObject } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import { type MouseEvent } from 'react'

export type ICommand = {
  name: string
  callback: (context: any) => any
  shortcut?: string
  when?: () => boolean
}

export type MenuItem = ICommand & { children?: MenuItem[][] }

export class ContextMenuState extends Service {
  constructor() {
    super()
    autoBind(makeObservable(this))
    this.effect(this.hideMenuWhenRouterChange())
  }

  @observable.ref menus: MenuItem[][] = []
  context = <AnyObject>{}

  private ref!: HTMLDivElement

  setRef(ref: HTMLDivElement) {
    this.ref = ref
  }

  openMenu(e: MouseEvent) {
    e.preventDefault()
    this.ref.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
      }),
    )
  }

  private hideMenuWhenRouterChange() {
    return listen('popstate', () => (this.menus = []))
  }
}
