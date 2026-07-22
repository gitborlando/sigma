import { NodeController } from 'src/editor/controller/node'
import { SchemaCreator } from 'src/editor/schema/creator'
import { Undo } from '../../core/undo'
import { YState } from '../../y-adapter/y-state'
import { DesignEffect } from './effect'

@reflection
export class DesignStroke extends DesignEffect<'strokes'> {
  get strokes() {
    return this.items
  }

  get isMixedStrokes() {
    return this.isMixed
  }

  constructor(
    yState: YState,
    private readonly schemaCreator: SchemaCreator,
    private readonly undo: Undo,
    nodeController: NodeController,
  ) {
    super(yState, nodeController, 'strokes')
    autoBind(this)
    this.effect(autorun(this.setupItems))
  }

  newStroke() {
    return this.schemaCreator.stroke({ fill: this.schemaCreator.fillColor() })
  }

  addStroke() {
    this.addItem(this.newStroke())
    this.undo.track('state', t('add stroke'))
  }

  deleteStroke(index: number) {
    this.deleteItem(index)
    this.undo.track('state', t('delete stroke'))
  }

  setStroke<T extends S.Stroke>(index: number, setter: (stroke: T) => T | void) {
    this.updateItem(index, setter)
  }
}
