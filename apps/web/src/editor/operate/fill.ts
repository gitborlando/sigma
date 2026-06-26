import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone } from '@gitborlando/utils'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { COLOR } from 'src/utils/color'
import { EditorService, type EditorService2 } from '..'
import { getSelectedNodes } from '../utils/get'

export class OperateFillService extends EditorService {
  @observable.ref fills = <S.Fill[]>[]
  isMultiFills = false

  subscribe() {
    return Disposer.combine(
      this.editor.handleSelect.afterSelect.hook(() => {
        this.setupFills()
      }),
      this.editor.yState.subscribe((patches) => {
        if (!patches.some((p) => p.keys[1] === 'fills')) return
        this.updateFills()
      }),
    )
  }

  @action
  setupFills() {
    this.fills = []
    this.isMultiFills = false
    const nodes = getSelectedNodes(this.editor)
    if (nodes.length === 1) return (this.fills = clone(nodes[0].fills))
    if (nodes.length > 1) {
      if (this.isSameFills(nodes)) return (this.fills = clone(nodes[0].fills))
      return (this.isMultiFills = true)
    }
  }

  updateFills() {
    const nodes = getSelectedNodes(this.editor)
    this.fills = clone(nodes[0].fills)
  }

  newFill() {
    return this.editor.schemaCreator.fillColor(
      COLOR.gray,
      this.fills.length ? 0.25 : 1,
    )
  }

  setFills(setter: (draft: S.Fill[]) => any) {
    const [fills, patches] = produceWithPatches(this.fills, setter)
    this.fills = fills
    this.applyChangeToYState(patches)
  }

  setFill<T extends S.Fill>(index: number, setter: (fill: T) => T | void) {
    this.setFills((fills) => {
      if (fills[index]) {
        const result = setter(fills[index] as T)
        if (result) fills[index] = result
      }
    })
  }

  onAfterSetFills() {
    this.editor.undo.track('state', t('change fill'))
  }

  applyChangeToYState(patches: Patch[]) {
    const nodes = getSelectedNodes(this.editor)
    this.editor.yState.transact(() => {
      nodes.forEach((node) => {
        if (this.isMultiFills) {
          this.editor.yState.set<S.Node>([node.id, 'fills'], [])
        }
        applyFillPatches(this.editor, node.id, patches)
      })
    })
  }

  private isSameFills(nodes: S.Node[]) {
    let isSame = true
    const firstNode = nodes[0]

    nodes.forEach((node) => {
      if (!isSame) return
      if (node.fills.length !== firstNode.fills.length) return (isSame = false)
      firstNode.fills.forEach((fill, index) => {
        const otherFill = node.fills[index]
        if (fill.type !== otherFill.type) return (isSame = false)
        if (!equal(fill, otherFill)) return (isSame = false)
      })
    })

    return isSame
  }
}

function applyFillPatches(editor: EditorService2, id: ID, patches: Patch[]) {
  patches.forEach((patch) => {
    const path = [id, 'fills', ...patch.path] as [
      ID,
      'fills',
      ...(string | number)[],
    ]

    switch (patch.op) {
      case 'add':
        if (!Number.isNaN(Number(path[path.length - 1]))) {
          editor.yState.insert(path, clone(patch.value))
        } else {
          editor.yState.set(path, clone(patch.value))
        }
        return
      case 'replace':
        return editor.yState.set(path, clone(patch.value))
      case 'remove':
        return editor.yState.delete(path)
    }
  })
}
