import { NodeController } from 'src/editor/controller/node'
import { SchemaCreator } from 'src/editor/schema/creator'
import { COLOR } from 'src/utils/color'
import { Undo } from '../../core/undo'
import { YState } from '../../y-adapter/y-state'
import { DesignEffect } from './effect'

@reflection
export class DesignFill extends DesignEffect<'fills'> {
  get fills() {
    return this.value
  }

  get isMixedFills() {
    return this.isMixed
  }

  constructor(
    yState: YState,
    private readonly schemaCreator: SchemaCreator,
    private readonly undo: Undo,
    nodeController: NodeController,
  ) {
    super(yState, nodeController, 'fills', [], 'replace')
    autoBind(this)
    this.effect(autorun(this.setupValue))
  }

  newFill() {
    return this.schemaCreator.fillColor(COLOR.gray, this.fills.length ? 0.25 : 1)
  }

  addFill() {
    this.updateValue((fills) => void fills.push(this.newFill()))
    this.undo.track('state', t('add fill'))
  }

  deleteFill(index: number) {
    this.updateValue((fills) => void fills.splice(index, 1))
    this.undo.track('state', t('delete fill'))
  }

  setFill<T extends S.Fill>(index: number, setter: (fill: T) => T | void) {
    this.updateValue((fills) => {
      if (!fills[index]) return

      const result = setter(fills[index] as T)
      if (result) fills[index] = result
    })
  }
}
