import { Disposer } from '@gitborlando/toolkit'

export abstract class Service {
  protected disposer = new Disposer()

  subscribe() {
    return () => {}
  }

  dispose() {
    this.disposer.dispose()
  }
}
