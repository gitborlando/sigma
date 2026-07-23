import { clone } from '@gitborlando/utils'
import type { YPlainPath } from '@gitborlando/y-plain'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { NodeController } from 'src/editor/controller/node'
import { Service } from 'src/global/service'
import { YState } from '../../y-adapter/y-state'

type DesignEffectKey = 'fills' | 'stroke'
type DesignEffectValue<Key extends DesignEffectKey> = S.Node[Key]
type MixedUpdateStrategy = 'patch' | 'replace'

type DynamicYStateMutation = {
  insert: (path: YPlainPath, value: unknown) => boolean
  set: (path: YPlainPath, value: unknown) => boolean
  delete: (path: YPlainPath) => boolean
}

export abstract class DesignEffect<Key extends DesignEffectKey> extends Service {
  @observable.ref protected value: DesignEffectValue<Key>
  @observable protected isMixed = false

  constructor(
    private readonly yState: YState,
    private readonly nodeController: NodeController,
    private readonly property: Key,
    private readonly initialValue: DesignEffectValue<Key>,
    private readonly mixedUpdateStrategy: MixedUpdateStrategy,
  ) {
    super()
    this.value = clone(initialValue)
    makeObservable(this)
  }

  protected setupValue() {
    this.value = clone(this.initialValue)
    this.isMixed = false
    const nodes = this.nodeController.selectNodes
    if (nodes.length === 0) return

    const firstValue = nodes[0][this.property]
    if (nodes.length === 1 || this.isSameValue(nodes, firstValue)) {
      this.value = clone(firstValue)
      return
    }

    this.isMixed = true
    if (this.mixedUpdateStrategy === 'patch') this.value = clone(firstValue)
  }

  protected updateValue(setter: (value: DesignEffectValue<Key>) => any) {
    const [value, patches] = produceWithPatches(this.value, setter)
    this.value = value
    this.applyPatches(patches)
  }

  private applyPatches(patches: Patch[]) {
    const nodes = this.nodeController.selectNodes
    this.yState.transact(() => {
      nodes.forEach((node) => {
        if (this.isMixed && this.mixedUpdateStrategy === 'replace') {
          this.yState.set<S.Node>([node.id, this.property], clone(this.value))
          return
        }
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

  private isSameValue(nodes: S.Node[], firstValue: DesignEffectValue<Key>) {
    return nodes.every((node) => equal(node[this.property], firstValue))
  }
}
