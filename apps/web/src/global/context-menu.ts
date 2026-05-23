import { AnyObject } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { type MouseEvent } from 'react'

export type Command = {
  name: string
  callback: (context: any) => any
  shortcut?: string
  when?: () => boolean
}

export type MenuItem = Command & {
  children?: MenuItem[][]
}

@autobind
class ContextMenuService {
  @observable menus: MenuItem[][] = []
  context = <AnyObject>{}
  triggered = false

  private ref!: HTMLDivElement

  setRef(ref: HTMLDivElement) {
    this.ref = ref
  }

  openMenu(e: MouseEvent) {
    if (this.triggered) return
    this.triggered = true

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

export const ContextMenu = makeObservable(new ContextMenuService())
