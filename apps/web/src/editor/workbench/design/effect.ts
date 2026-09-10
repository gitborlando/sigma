import { Service } from '@gitborlando/di-service'
import { clone } from '@gitborlando/utils'
import type { YPlainPath } from '@gitborlando/y-plain'
import equal from 'fast-deep-equal'
import { Patch, produceWithPatches } from 'immer'
import { makeObservable } from 'mobx'
import { NodeAction } from 'src/editor/action/node'
import { Select } from 'src/editor/select'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/shared/constant'

type DesignEffectKey = 'fills' | 'stroke'
type DesignEffectValue<Key extends DesignEffectKey> = S.Node[Key]

type DynamicYDocMutation = {
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
    protected readonly yDoc: YDoc,
    protected readonly nodeAction: NodeAction,
    protected readonly select: Select,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(autorun(this.onSetupValue))
  }

  protected onSetupValue() {
    const nodes = this.select.observedSelectedNodes
    this.value = undefined
    this.isMixed = false
    if (nodes.length === 0) return

    const firstValue = nodes[0][this.property]
    if (this.allNodesSame(nodes, firstValue)) {
      this.value = clone(firstValue)
    }
  }

  protected updateValue(setter: (value: DesignEffectValue<Key>) => any) {
    const isMixed = this.value === undefined
    const lastValue = this.value || this.getInitialValue()
    const [value, patches] = produceWithPatches(lastValue, setter)

    this.yDoc.transact(() => {
      this.select.getSelectedNodes().forEach((node) => {
        if (!isMixed) this.applyNodePatches(node.id, patches)
        else this.yDoc.set<any>([GRAPHS, node.id, this.property], value)
      })
    })
  }

  private allNodesSame(nodes: S.Node[], firstValue: DesignEffectValue<Key>) {
    return nodes.every((node) => equal(node[this.property], firstValue))
  }

  private applyNodePatches(id: ID, patches: Patch[]) {
    const mutation = this.yDoc as unknown as DynamicYDocMutation

    patches.forEach((patch) => {
      const path: YPlainPath = [GRAPHS, id, this.property, ...patch.path]

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
