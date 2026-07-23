import { NodeController } from 'src/editor/controller/node'
import { SchemaCreator } from 'src/editor/schema/creator'
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
    schemaCreator: SchemaCreator,
    nodeController: NodeController,
  ) {
    super(yState, nodeController, 'stroke', schemaCreator.stroke(), 'patch')
    autoBind(this)
    this.effect(autorun(this.setupValue))
  }

  setStroke(setter: (stroke: S.Stroke) => S.Stroke | void) {
    this.updateValue((stroke) => setter(stroke))
  }
}
