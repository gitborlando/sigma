import { Disposer } from '@gitborlando/toolkit/disposer'
import { clone } from '@gitborlando/utils'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { Undo } from 'src/editor/core/undo'
import { HandleSelect } from 'src/editor/handle/select'
import { YState } from 'src/editor/y-adapter/y-state'
import { COLOR } from 'src/utils/color'
import { SchemaCreator } from '../schema/creator'
import { getSelectedNodes } from '../utils/get'

class OperateFillService {
  @observable.ref fills = <S.Fill[]>[]
  isMultiFills = false

  subscribe() {
    return Disposer.combine(
      HandleSelect.afterSelect.hook(() => {
        this.setupFills()
      }),
      YState.subscribe((patches) => {
        if (!patches.some((p) => p.keys[1] === 'fills')) return
        this.updateFills()
      }),
    )
  }

  @action
  setupFills() {
    this.fills = []
    this.isMultiFills = false
    const nodes = getSelectedNodes()
    if (nodes.length === 1) return (this.fills = clone(nodes[0].fills))
    if (nodes.length > 1) {
      if (this.isSameFills(nodes)) return (this.fills = clone(nodes[0].fills))
      return (this.isMultiFills = true)
    }
  }

  updateFills() {
    const nodes = getSelectedNodes()
    this.fills = clone(nodes[0].fills)
  }

  newFill() {
    return SchemaCreator.fillColor(COLOR.gray, this.fills.length ? 0.25 : 1)
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
    Undo.track('state', t('change fill'))
  }

  applyChangeToYState(patches: Patch[]) {
    const nodes = getSelectedNodes()
    YState.transact(() => {
      nodes.forEach((node) => {
        if (this.isMultiFills) YState.set<S.Node>([node.id, 'fills'], [])
        applyFillPatches(node.id, patches)
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

function applyFillPatches(id: ID, patches: Patch[]) {
  patches.forEach((patch) => {
    const path = [id, 'fills', ...patch.path] as [
      ID,
      'fills',
      ...(string | number)[],
    ]

    switch (patch.op) {
      case 'add':
        if (!Number.isNaN(Number(path[path.length - 1]))) {
          YState.insert(path, clone(patch.value))
        } else {
          YState.set(path, clone(patch.value))
        }
        return
      case 'replace':
        return YState.set(path, clone(patch.value))
      case 'remove':
        return YState.delete(path)
    }
  })
}

export const OperateFill = autoBind(makeObservable(new OperateFillService()))
