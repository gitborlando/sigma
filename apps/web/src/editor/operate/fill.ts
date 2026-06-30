import { clone } from '@gitborlando/utils'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { Service } from 'src/global/service'
import { COLOR } from 'src/utils/color'
import { UndoService } from '../core/undo'
import { HandleSelectService } from '../handle/select'
import { YStateService } from '../y-adapter/y-state'

export class OperateFillService extends Service {
  @observable.ref fills = <S.Fill[]>[]
  isMultiFills = false

  constructor(
    private readonly handleSelect: HandleSelectService,
    private readonly yState: YStateService,
    private readonly schemaCreator: SchemaCreatorService,
    private readonly undo: UndoService,
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

function applyFillPatches(yState: YStateService, id: ID, patches: Patch[]) {
  patches.forEach((patch) => {
    const path = [id, 'fills', ...patch.path] as [
      ID,
      'fills',
      ...(string | number)[],
    ]

    switch (patch.op) {
      case 'add':
        if (!Number.isNaN(Number(path[path.length - 1]))) {
          yState.insert(path, clone(patch.value))
        } else {
          yState.set(path, clone(patch.value))
        }
        return
      case 'replace':
        return yState.set(path, clone(patch.value))
      case 'remove':
        return yState.delete(path)
    }
  })
}
