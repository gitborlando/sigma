import { NodeAction } from 'src/editor/action/node'
import { Undo } from 'src/editor/action/undo'
import { SchemaCreator } from 'src/editor/schema/creator'
import { Select } from 'src/editor/select'
import { DesignEffect } from 'src/editor/workbench/design/effect'
import { YState } from 'src/editor/y-adapter/y-state'
import { COLOR } from 'src/utils/color'

@reflection
export class DesignStroke extends DesignEffect<'stroke'> {
  get stroke() {
    return this.value
  }

  constructor(
    protected readonly undo: Undo,
    protected readonly yState: YState,
    protected readonly schemaCreator: SchemaCreator,
    protected readonly nodeAction: NodeAction,
    protected readonly select: Select,
  ) {
    super('stroke', () => schemaCreator.stroke(), yState, nodeAction, select)
    autoBind(this)
  }

  get strokeSide() {
    const nodes = this.select.getSelectedNodes()
    if (nodes.length !== 1) return

    const node = nodes[0]
    if (!('strokeSide' in node)) return

    return node.strokeSide
  }

  setStroke(setter: (stroke: S.Stroke) => S.Stroke | void) {
    this.updateValue((stroke) => setter(stroke))
  }

  setStrokeSide(type: Exclude<S.StrokeSide['type'], 'custom'>) {
    if (!this.strokeSide) return

    this.yState.transact(() => {
      this.select.getSelectedNodes().forEach((node) => {
        this.yState.set<S.Rectangle>([node.id, 'strokeSide'], { type })
      })
    })
    this.undo.track('state', t('change stroke side'))
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
    this.setStroke((stroke) => {
      if (!stroke.fills[index]) return

      const result = setter(stroke.fills[index] as T)
      if (result) stroke.fills[index] = result
    })
  }
}
