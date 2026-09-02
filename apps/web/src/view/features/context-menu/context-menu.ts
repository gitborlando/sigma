import { AnyObject } from '@gitborlando/utils'
import { type MouseEvent } from 'react'

export type ICommand = {
  name: string
  callback: (context: any) => any
  shortcut?: string
  when?: () => boolean
}

export type MenuItem = ICommand & { children?: MenuItem[][] }

export class ContextMenuState {
  constructor() {
    autoBind(makeObservable(this))

    window.addEventListener('popstate', () => {
      this.menus = []
    })
  }

  @observable.ref menus: MenuItem[][] = []
  context = <AnyObject>{}
  triggered = false

  private ref!: HTMLDivElement

  setRef(ref: HTMLDivElement) {
    this.ref = ref
  }

  openMenu(e: MouseEvent) {
    // if (this.triggered) return
    // this.triggered = true

    // this.context ??= context ?? {}
    // this.menus ??= menus ?? []

    e.preventDefault()
    this.ref.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
      }),
    )
  }
}
