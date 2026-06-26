import { EditorService2 } from 'src/editor'
import { Service } from 'src/global/service'

export class EditorService extends Service {
  constructor(protected editor: EditorService2) {
    super()
  }
}
