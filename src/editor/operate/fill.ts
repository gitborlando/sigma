import autoBind from 'auto-bind'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { getSelectedNodes } from 'src/editor/y-state/y-state'
import { clone } from 'src/shared/utils/normal'
import { SchemaCreator } from '../schema/creator'

class OperateFillService {
  @observable.ref fills = <S.Fill[]>[]
  isMultiFills = false

  init() {
    YClients.afterSelect.hook(() => {
      this.setupFills()
    })
    YState.subscribe((patches) => {
      if (!patches.some((p) => p.keys[1] === 'fills')) return
      this.updateFills()
    })
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
    YUndo.track({ type: 'state', description: '改变 fill' })
  }

  applyChangeToYState(patches: Patch[]) {
    const nodes = getSelectedNodes()
    nodes.forEach((node) => {
      if (this.isMultiFills) YState.set(`${node.id}.fills`, [])
      YState.applyImmerPatches(patches, `${node.id}.fills`)
    })
    YState.next()
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

export const OperateFill = autoBind(makeObservable(new OperateFillService()))
