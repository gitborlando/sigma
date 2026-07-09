import { AABB } from '@gitborlando/geo'
import { Signal } from '@gitborlando/signal'
import { Service } from 'src/global/service'
import { Elem } from './elem'

@reflection
export class RenderInvalidator extends Service {
  private dirtyRects = new Set<AABB>()
  private hasWidgetDirty = false
  readonly dirty$ = Signal.create()

  collectDirty(elem: Elem) {
    const dirtyRect = elem.getDirtyRect()

    if (elem.type === 'widgetElem') {
      this.hasWidgetDirty = true
      this.dirty$.dispatch()
      return
    }

    if (!dirtyRect) return

    this.dirtyRects.add(
      new AABB(dirtyRect.minX, dirtyRect.minY, dirtyRect.maxX, dirtyRect.maxY),
    )
    this.dirty$.dispatch()
  }

  takeDirtyRects() {
    const dirtyRects = new Set(this.dirtyRects)
    this.dirtyRects.clear()
    return dirtyRects
  }

  takeWidgetDirty() {
    const hasWidgetDirty = this.hasWidgetDirty
    this.hasWidgetDirty = false
    return hasWidgetDirty
  }

  reset() {
    this.dirtyRects.clear()
    this.hasWidgetDirty = false
  }
}
