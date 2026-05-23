import { clone, Is } from '@gitborlando/utils'
import { Patch } from 'immer'

type IKey = string | number

type AnyObject = Record<string, any>

export type ImmutPatch = {
  type: 'add' | 'remove' | 'replace'
  keys: IKey[]
  value?: any
  oldValue?: any
}

export default class Immut<T extends AnyObject = AnyObject> {
  constructor(public state: T) {}

  get = <T>(keyPath: string, isParent = false) => {
    const keys = keyPath.split(/\.|\//) as IKey[]
    let current: any = this.state
    let len = isParent ? keys.length - 1 : keys.length
    for (let i = 0; i < len; i++) {
      current = current[keys[i]]
      if (Is.falsy(current) && isParent) console.log('Immut error at get function')
    }
    return current as T
  }

  insert = <T>(keyPath: string, value: T) => {
    const keys = keyPath.split(/\.|\//) as IKey[]
    const lastKey = Number(keys[keys.length - 1])

    if (Number.isNaN(lastKey)) {
      const parent = this.get<any>(keyPath)
      parent.push(value)
      keys.push(parent.length - 1)
    } else {
      const parent = this.get<any[]>(keyPath, true)
      parent.splice(lastKey, 0, value)
    }

    this._track({ type: 'add', keys, value, oldValue: undefined })
  }

  set = <T>(keyPath: string, value: T) => {
    const keys = keyPath.split(/\.|\//) as IKey[]
    const parent = this.get<any>(keyPath, true)
    const lastKey = keys[keys.length - 1]
    const oldValue = parent[lastKey]

    parent[lastKey] = value

    if (oldValue === undefined) {
      this._track({ type: 'add', keys, value, oldValue: undefined })
    } else if (oldValue !== value) {
      this._track({ type: 'replace', keys, value, oldValue })
    }
  }

  delete = (keyPath: string) => {
    const keys = keyPath.split(/\.|\//) as IKey[]
    const parent = this.get<any>(keyPath, true)
    const lastKey = keys[keys.length - 1]
    const oldValue = parent[lastKey]

    if (Array.isArray(parent)) {
      parent.splice(<any>lastKey, 1)
    } else {
      delete parent[lastKey]
    }

    this._track({ type: 'remove', keys, value: undefined, oldValue })
  }

  track = <T>(type: 'add' | 'remove' | 'replace', keyPath: string, value: T) => {
    const keys = keyPath.split(/\.|\//) as IKey[]
    const oldValue = this.get<any>(keyPath)
    this._track({ type, keys, value, oldValue })
  }

  next = () => {
    this.traverse(this.state, this.changeMap)
    this.listeners.forEach((callback) => callback(this.patches))

    this.accumulatePatches.push(...this.patches)
    this.patches = []
    this.changeMap = {}
  }

  subscribe = (callback: (patches: ImmutPatch[]) => void) => {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private accumulatePatches: ImmutPatch[] = []

  getPatches = () => {
    const keyPatchMap = new Map<string, ImmutPatch>()
    this.accumulatePatches.forEach((patch) => {
      const keyPath = patch.keys.join('.')
      if (keyPatchMap.has(keyPath)) {
        const existingPatch = keyPatchMap.get(keyPath)!
        existingPatch.value = patch.value
      } else {
        keyPatchMap.set(keyPath, patch)
      }
    })
    this.accumulatePatches = []
    return this.deepClone([...keyPatchMap.values()])
  }

  applyImmerPatches = (patches: Patch[], prefix: string) => {
    const prefixes = prefix.split('.') as (string | number)[]
    patches.forEach((patch) => {
      const keys = prefixes.concat(patch.path)
      switch (patch.op) {
        case 'add':
          if (!Number.isNaN(Number(keys[keys.length - 1]))) {
            this.insert(keys.join('.'), clone(patch.value))
          } else {
            this.set(keys.join('.'), clone(patch.value))
          }
          return
        case 'replace':
          return this.set(keys.join('.'), clone(patch.value))
        case 'remove':
          return this.delete(keys.join('.'))
      }
    })
  }

  private patches = <ImmutPatch[]>[]
  private changeMap = <any>{}
  private listeners = new Set<(...args: any) => any>()

  private _track = (patch: ImmutPatch) => {
    patch.value = this.deepClone(patch.value)
    patch.oldValue = this.deepClone(patch.oldValue)
    this.patches.push(patch)

    let curMap = this.changeMap
    patch.keys.forEach((key, i) => {
      if (i !== patch.keys.length - 1) {
        if (!curMap[key]) curMap = curMap[key] = {}
      } else {
        curMap[key] = undefined
      }
    })
  }

  private traverse = (object: any, changeMap: any) => {
    if (typeof changeMap !== 'object') return

    for (const key in changeMap) {
      if (!object[key]) continue

      object[key] = this.shallowClone(object[key])
      this.traverse(object[key], changeMap[key])
    }
  }

  private shallowClone = (object: any) => {
    if (typeof object !== 'object' || object === null) return object
    return Array.isArray(object) ? [...object] : { ...object }
  }

  private deepClone = (object: any) => {
    if (typeof object !== 'object' || object === null) return object
    const newObj: any = Array.isArray(object) ? [] : {}
    for (const key in object) newObj[key] = this.deepClone(object[key])
    return newObj
  }
}
