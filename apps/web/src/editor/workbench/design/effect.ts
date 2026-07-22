import { clone } from '@gitborlando/utils'
import type { YPlainPath } from '@gitborlando/y-plain'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { NodeController } from 'src/editor/controller/node'
import { Service } from 'src/global/service'
import { YState } from '../../y-adapter/y-state'

type DesignEffectKey = 'fills' | 'strokes'
type DesignEffectItem<Key extends DesignEffectKey> = S.Node[Key][number]

type DynamicYStateMutation = {
  insert: (path: YPlainPath, value: unknown) => boolean
  set: (path: YPlainPath, value: unknown) => boolean
  delete: (path: YPlainPath) => boolean
}

export abstract class DesignEffect<Key extends DesignEffectKey> extends Service {
  @observable.ref protected items = <DesignEffectItem<Key>[]>[]
  @observable protected isMixed = false

  constructor(
    private readonly yState: YState,
    private readonly nodeController: NodeController,
    private readonly property: Key,
  ) {
    super()
    makeObservable(this)
  }

  protected setupItems() {
    this.items = []
    this.isMixed = false
    const nodes = this.nodeController.selectNodes
    if (nodes.length === 0) return

    const firstItems = nodes[0][this.property] as DesignEffectItem<Key>[]
    if (nodes.length === 1 || this.isSameItems(nodes, firstItems)) {
      this.items = clone(firstItems)
      return
    }

    this.isMixed = true
  }

  protected addItem(item: DesignEffectItem<Key>) {
    this.updateItems((items) => void items.push(item))
  }

  protected deleteItem(index: number) {
    this.updateItems((items) => void items.splice(index, 1))
  }

  protected updateItem<T extends DesignEffectItem<Key>>(
    index: number,
    setter: (item: T) => T | void,
  ) {
    this.updateItems((items) => {
      if (!items[index]) return

      const result = setter(items[index] as T)
      if (result) items[index] = result
    })
  }

  private updateItems(setter: (items: DesignEffectItem<Key>[]) => any) {
    const [items, patches] = produceWithPatches(this.items, setter)
    this.items = items
    this.applyPatches(patches)
  }

  private applyPatches(patches: Patch[]) {
    const nodes = this.nodeController.selectNodes
    this.yState.transact(() => {
      nodes.forEach((node) => {
        if (this.isMixed) this.yState.set<S.Node>([node.id, this.property], [])
        this.applyNodePatches(node.id, patches)
      })
    })
    this.isMixed = false
  }

  private applyNodePatches(id: ID, patches: Patch[]) {
    const mutation = this.yState as unknown as DynamicYStateMutation

    patches.forEach((patch) => {
      const path: YPlainPath = [id, this.property, ...patch.path]

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

  private isSameItems(nodes: S.Node[], firstItems: DesignEffectItem<Key>[]) {
    return nodes.every((node) => equal(node[this.property], firstItems))
  }
}
