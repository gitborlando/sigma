import { clone } from '@gitborlando/utils'
import type { YPlainPath } from '@gitborlando/y-plain'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { NodeAction } from 'src/editor/action/node'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

type DesignEffectKey = 'fills' | 'stroke'
type DesignEffectValue<Key extends DesignEffectKey> = S.Node[Key]

type DynamicYStateMutation = {
  insert: (path: YPlainPath, value: unknown) => boolean
  set: (path: YPlainPath, value: unknown) => boolean
  delete: (path: YPlainPath) => boolean
}

export abstract class DesignEffect<Key extends DesignEffectKey> extends Service {
  @observable.ref protected value: DesignEffectValue<Key> | undefined
  @observable protected isMixed = false

  constructor(
    private readonly property: Key,
    private readonly getInitialValue: () => DesignEffectValue<Key>,
    protected readonly yState: YState,
    protected readonly nodeAction: NodeAction,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(autorun(this.onSetupValue))
  }

  protected get nodes() {
    return this.nodeAction.selectNodes
  }

  protected onSetupValue() {
    this.value = undefined
    this.isMixed = false
    if (this.nodes.length === 0) return

    const firstValue = this.nodes[0][this.property]
    if (this.allNodesSame(this.nodes, firstValue)) {
      this.value = clone(firstValue)
    }
  }

  protected updateValue(setter: (value: DesignEffectValue<Key>) => any) {
    const isMixed = this.value === undefined
    const lastValue = this.value || this.getInitialValue()
    const [value, patches] = produceWithPatches(lastValue, setter)

    this.yState.transact(() => {
      this.nodes.forEach((node) => {
        if (!isMixed) this.applyNodePatches(node.id, patches)
        else this.yState.set<S.Node>([node.id, this.property], value)
      })
    })
  }

  private allNodesSame(nodes: S.Node[], firstValue: DesignEffectValue<Key>) {
    return nodes.every((node) => equal(node[this.property], firstValue))
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
}
