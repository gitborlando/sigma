import { NodeAction } from 'src/editor/action/node'
import { Undo } from 'src/editor/action/undo'
import { DocCreator } from 'src/editor/doc/creator'
import { Select } from 'src/editor/select'
import { DesignEffect } from 'src/editor/workbench/design/effect'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/global/constant'
import { COLOR } from 'src/shared/color'

@reflection
export class DesignStroke extends DesignEffect<'stroke'> {
  get stroke() {
    return this.value
  }

  constructor(
    protected readonly undo: Undo,
    protected readonly yDoc: YDoc,
    protected readonly docCreator: DocCreator,
    protected readonly nodeAction: NodeAction,
    protected readonly select: Select,
  ) {
    super('stroke', () => docCreator.stroke(), yDoc, nodeAction, select)
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

    this.yDoc.transact(() => {
      this.select.getSelectedNodes().forEach((node) => {
        this.yDoc.set<S.Rect>([GRAPHS, node.id, 'strokeSide'], { type })
      })
    })
    this.undo.track('state', t('change stroke side'))
  }

  addFill() {
    const fill = this.docCreator.fillColor(COLOR.black)
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
