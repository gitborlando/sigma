import { AnyObject } from '@gitborlando/utils'
import { type MouseEvent } from 'react'

export type ICommand = {
  name: string
  callback: (context: any) => any
  shortcut?: string
  when?: () => boolean
}

export type MenuItem = ICommand & { children?: MenuItem[][] }

class ContextMenuClass {
  @observable open = false

  menus: MenuItem[][] = []
  context = <AnyObject>{}
  triggered = false

  private ref!: HTMLDivElement

  setRef(ref: HTMLDivElement) {
    this.ref = ref
  }

  openContextMenu(e: MouseEvent, menus?: MenuItem[][], context?: AnyObject) {
    if (this.triggered) return
    this.triggered = true

    this.open = true

    this.menus ??= menus ?? []
    this.context ??= context ?? {}

    e.preventDefault()
    this.ref.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: e.clientX,
        clientY: e.clientY,
      }),
    )
  }

  openMenu(trigger: HTMLElement, menus?: MenuItem[][], context?: AnyObject) {}
}

export const ContextMenu = autoBind(makeObservable(new ContextMenuClass()))
