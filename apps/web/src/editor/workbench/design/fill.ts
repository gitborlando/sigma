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

  constructor(
    protected readonly yState: YState,
    protected readonly nodeController: NodeController,
    private readonly schemaCreator: SchemaCreator,
    private readonly undo: Undo,
  ) {
    super('fills', () => [schemaCreator.fillColor()], yState, nodeController)
    autoBind(this)
  }

  newFill() {
    return this.schemaCreator.fillColor(COLOR.gray, this.fills?.length ? 0.25 : 1)
  }

  addFill() {
    this.updateValue((fills) => {
      if (!this.fills) return
      void fills.push(this.newFill())
    })
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
