import { Service } from '@gitborlando/di-service'
import autoBind from 'auto-bind'

export class Realtime extends Service {
  constructor() {
    super()
    autoBind(this)
  }

  fetch(id: string) {}
}
