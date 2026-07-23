import { clone } from '@gitborlando/utils'
import { NodeController } from 'src/editor/controller/node'
import { SchemaCreator } from 'src/editor/schema/creator'
import { COLOR } from 'src/utils/color'
import { Undo } from '../../core/undo'
import { YState } from '../../y-adapter/y-state'
import { DesignEffect } from './effect'

@reflection
export class DesignStroke extends DesignEffect<'stroke'> {
  get stroke() {
    return this.value
  }

  get isMixedStroke() {
    return this.isMixed
  }

  constructor(
    yState: YState,
    private readonly schemaCreator: SchemaCreator,
    private readonly undo: Undo,
    nodeController: NodeController,
  ) {
    super(yState, nodeController, 'stroke', schemaCreator.stroke(), 'patch')
    autoBind(this)
    this.effect(autorun(this.setupValue))
  }

  setStroke(setter: (stroke: S.Stroke) => S.Stroke | void) {
    this.updateValue((stroke) => setter(stroke))
  }

  addFill() {
    const fill = this.schemaCreator.fillColor(COLOR.black)
    this.setStroke((stroke) => {
      stroke.visible = true
      stroke.fills = [...stroke.fills, fill]
    })
    this.undo.track('state', t('add stroke fill'))
  }

  deleteFill(index: number) {
    this.setStroke((stroke) => {
      stroke.fills = stroke.fills.filter((_, fillIndex) => fillIndex !== index)
    })
    this.undo.track('state', t('delete stroke fill'))
  }

  setFill<T extends S.Fill>(index: number, setter: (fill: T) => T | void) {
    if (this.isMixed) {
      const fills = clone(this.stroke.fills)
      if (!fills[index]) return

      const result = setter(fills[index] as T)
      if (result) fills[index] = result
      this.setStroke((stroke) => void (stroke.fills = fills))
      return
    }

    this.setStroke((stroke) => {
      if (!stroke.fills[index]) return

      const result = setter(stroke.fills[index] as T)
      if (result) stroke.fills[index] = result
    })
  }
}
