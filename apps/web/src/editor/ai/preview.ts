import { Service } from '@gitborlando/di-service'
import { makeObservable, observable } from 'mobx'
import { projectAiPreview, type AiPreviewScene } from './preview-scene'
import type { AiPageSnapshot, AiTarget } from './schema'

@reflection
export class AiPreview extends Service {
  @observable active = false
  @observable.ref scene?: AiPreviewScene

  private target: AiTarget = 'new'
  private snapshot?: AiPageSnapshot

  constructor() {
    super()
    makeObservable(this)
  }

  begin(target: AiTarget, snapshot?: AiPageSnapshot) {
    this.target = target
    this.snapshot = snapshot
    this.active = true
    this.scene = projectAiPreview(target, snapshot, [])
  }

  update(operations: unknown[]) {
    if (!this.active) return
    this.scene = projectAiPreview(this.target, this.snapshot, operations)
  }

  clear() {
    this.active = false
    this.scene = undefined
    this.snapshot = undefined
  }
}
