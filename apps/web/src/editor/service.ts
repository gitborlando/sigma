import { Editor } from 'src/editor'
import { Service } from 'src/global/service'

export class EditorService extends Service {
  constructor(protected editor: Editor) {
    super()
  }
}
