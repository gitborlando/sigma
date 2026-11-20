import { Service } from '@gitborlando/di-service'
import { YPlain } from '@gitborlando/y-plain'
import { FileAPI } from '@sigma/api'
import { DocCreator } from 'src/editor/doc/creator'
import { mock_doc } from 'src/editor/doc/mock'
import { Try } from 'src/shared/export'
import { IndexeddbPersistence } from 'y-indexeddb'

@reflection
export class FileAction extends Service {
  constructor(
    private readonly docCreator: DocCreator,
    private readonly fileAPI: FileAPI,
  ) {
    super()
    autoBind(this)
  }

  async newFile(isMock: boolean) {
    const doc = isMock ? mock_doc(this.docCreator) : this.docCreator.doc()
    const yDoc = new Y.Doc()

    new YPlain(yDoc.getMap('doc'), doc)

    const id = crypto.randomUUID()
    const update = Y.encodeStateAsUpdate(yDoc)

    Try(
      () => this.fileAPI.createFile(id, update),
      Try.throwError,
      () => yDoc.destroy(),
    )
  }

  async deleteFile(id: string) {
    await this.fileAPI.deleteFile(id)
    await new IndexeddbPersistence(id, new Y.Doc()).clearData()
  }
}
