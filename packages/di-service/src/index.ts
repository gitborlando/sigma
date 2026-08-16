import { Disposer, DisposerFunc } from '@gitborlando/toolkit'

export abstract class Service {
  protected disposer = new Disposer()

  protected effect(...disposers: DisposerFunc[]) {
    return this.disposer.register(...disposers)
  }

  dispose() {
    this.disposer.dispose()
  }
}
