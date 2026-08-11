import { NodeAction } from 'src/editor/action/node'
import { DocCreator } from 'src/editor/doc/creator'
import { Select } from 'src/editor/select'
import { COLOR } from 'src/utils/color'
import { Undo } from '../../action/undo'
import { YDoc } from '../../y-adapter/y-doc'
import { DesignEffect } from './effect'

@reflection
export class DesignFill extends DesignEffect<'fills'> {
  get fills() {
    return this.value
  }

  constructor(
    protected readonly yDoc: YDoc,
    protected readonly nodeAction: NodeAction,
    protected readonly select: Select,
    private readonly docCreator: DocCreator,
    private readonly undo: Undo,
  ) {
    super('fills', () => [docCreator.fillColor()], yDoc, nodeAction, select)
    autoBind(this)
  }

  newFill() {
    return this.docCreator.fillColor(COLOR.gray, this.fills?.length ? 0.25 : 1)
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
