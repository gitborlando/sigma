import { Service } from '@gitborlando/di-service'
import autoBind from 'auto-bind'

export class ViewStateFiles extends Service {
  constructor() {
    super()
    autoBind(this)
  }
}
