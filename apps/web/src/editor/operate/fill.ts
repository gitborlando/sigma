import { clone } from '@gitborlando/utils'
import type { YPlainPath } from '@gitborlando/y-plain'
import equal from 'fast-deep-equal'
import { reflection } from 'first-di'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { SchemaCreator } from 'src/editor/schema/creator'
import { Service } from 'src/global/service'
import { COLOR } from 'src/utils/color'
import { Undo } from '../core/undo'
import { HandleSelect } from '../handle/select'
import { YState } from '../y-adapter/y-state'

type DynamicYStateMutation = {
  insert: (path: YPlainPath, value: unknown) => boolean
  set: (path: YPlainPath, value: unknown) => boolean
  delete: (path: YPlainPath) => boolean
}

@reflection
export class OperateFill extends Service {
  @observable.ref fills = <S.Fill[]>[]
  isMultiFills = false

  constructor(
    private readonly handleSelect: HandleSelect,
    private readonly yState: YState,
    private readonly schemaCreator: SchemaCreator,
    private readonly undo: Undo,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(autorun(this.setupFills))
    this.effect(
      this.yState.listen((patches) => {
        if (!patches.some((p) => p.keys[1] === 'fills')) return
        this.updateFills()
      }),
    )
  }

  @action
  setupFills() {
    this.fills = []
    this.isMultiFills = false
    const nodes = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )
    if (nodes.length === 1) return (this.fills = clone(nodes[0].fills))
    if (nodes.length > 1) {
      if (this.isSameFills(nodes)) return (this.fills = clone(nodes[0].fills))
      return (this.isMultiFills = true)
    }
  }

  updateFills() {
    const nodes = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )
    this.fills = clone(nodes[0].fills)
  }

  newFill() {
    return this.schemaCreator.fillColor(COLOR.gray, this.fills.length ? 0.25 : 1)
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
    this.undo.track('state', t('change fill'))
  }

  applyChangeToYState(patches: Patch[]) {
    const nodes = this.handleSelect.selectIdList.map((id) =>
      this.yState.find<S.Node>(id),
    )
    this.yState.transact(() => {
      nodes.forEach((node) => {
        if (this.isMultiFills) {
          this.yState.set<S.Node>([node.id, 'fills'], [])
        }
        applyFillPatches(this.yState, node.id, patches)
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

function applyFillPatches(yState: YState, id: ID, patches: Patch[]) {
  const mutation = yState as unknown as DynamicYStateMutation

  patches.forEach((patch) => {
    const path: YPlainPath = [id, 'fills', ...patch.path]

    switch (patch.op) {
      case 'add':
        if (!Number.isNaN(Number(path[path.length - 1]))) {
          mutation.insert(path, clone(patch.value))
        } else {
          mutation.set(path, clone(patch.value))
        }
        return
      case 'replace':
        return mutation.set(path, clone(patch.value))
      case 'remove':
        return mutation.delete(path)
    }
  })
}
