import { Service } from '@gitborlando/di-service'
import { makeObservable, observable } from 'mobx'
import type { AiPageSnapshot } from './schema'

@reflection
export class AiPreview extends Service {
  @observable.ref operations: unknown[] = []
  @observable.ref snapshot?: AiPageSnapshot
  @observable target: 'new' | 'current' = 'new'
  @observable active = false

  constructor() {
    super()
    makeObservable(this)
  }
  begin(target: 'new' | 'current', snapshot?: AiPageSnapshot) {
    this.target = target
    this.snapshot = snapshot
    this.operations = []
    this.active = true
  }
  update(operations: unknown[]) {
    this.operations = operations
  }
  clear() {
    this.active = false
    this.operations = []
    this.snapshot = undefined
  }
}
