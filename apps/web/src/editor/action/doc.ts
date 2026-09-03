import { Service } from '@gitborlando/di-service'
import { jsonParse } from '@gitborlando/utils'
import { AuthAPI, FileAPI } from '@sigma/api'
import JSZip from 'jszip'
import { Undo } from 'src/editor/action/undo'
import { DocCreator } from 'src/editor/doc/creator'
import { setupDocGetter } from 'src/editor/doc/getter'
import { migrateDoc } from 'src/editor/doc/migrate'
import { mock_doc } from 'src/editor/doc/mock'
import { Select } from 'src/editor/select'
import { LayerNodeTree } from 'src/editor/workbench/layer/node-tree'
import { YAware } from 'src/editor/y-adapter/y-aware'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { YSync } from 'src/editor/y-adapter/y-sync'
import { ObjectMgr } from 'src/global/services/toolkit/object-mgr'
import { Uploader } from 'src/global/services/toolkit/uploader'
import { tryCatch } from 'src/utils/export'

@reflection
export class DocAction extends Service {
  constructor(
    private readonly docCreator: DocCreator,
    private readonly yDoc: YDoc,
    private readonly ySync: YSync,
    private readonly yAware: YAware,
    private readonly undo: Undo,
    private readonly select: Select,
    private readonly layerNodeTree: LayerNodeTree,
    private readonly uploader: Uploader,
    private readonly objectMgr: ObjectMgr,
    private readonly fileAPI: FileAPI,
    private readonly authAPI: AuthAPI,
  ) {
    super()
    autoBind(this)
  }

  private sessionId = ''

  async newDoc(isMock: boolean) {
    const doc = isMock ? mock_doc(this.docCreator) : this.docCreator.doc()
    const user = await this.authAPI.getUser()
    if (!user) throw new Error('User not authenticated')

    const [file, error] = await tryCatch(() =>
      this.fileAPI.createFile({ userId: user.id }),
    )
    if (error) throw error

    await this.yDoc.setup(file.id, doc)

    // const update = Y.encodeStateAsUpdate(this.yDoc.yDoc)
  }

  async loadDoc(id: string) {
    return migrateDoc(await this.fetchDoc(id))
  }

  async setupDoc(id: string, doc?: S.Doc) {
    if (id === this.sessionId) return

    await this.yDoc.setup(id, doc)
    setupDocGetter(() => this.yDoc.doc)

    this.yDoc.register(this.layerNodeTree.onYDocPatch)
    // this.yDoc.onPatch(this.nodeAction.onYDocPatch)

    // 开发中暂时不启用y-sync
    // this.ySync.init(id, this.yDoc.doc)
    // this.yAware.init({
    //   clientId: this.yDoc.doc.clientID,
    //   awareness: this.ySync.awareness,
    // })
    this.undo.setup()

    this.select.selectPage(this.yDoc.doc.meta.pageIds[0])
    this.undo.mobxUndo.rebase()

    this.sessionId = id
    this.effect(() => (this.sessionId = ''))

    return this.yDoc.doc
  }

  private async fetchDoc(id: string) {
    if (id === 'mock') {
      const doc = mock_doc(this.docCreator)
      if (doc) return doc
      throw new Error('Failed to initialize mock doc')
    }

    const jsZip = new JSZip()

    const object = this.objectMgr.getObject('file', id)
    if (object) {
      const docText = await object.file.text()
      const doc = jsonParse(docText) as S.Doc | undefined
      this.objectMgr.removeObject('file', id)
      if (doc) return doc

      throw new Error('Failed to initialize doc')
    }

    // const fileMeta = await this.userFileAPI.getFileMeta(id)
    // if (!fileMeta) throw new Error('Failed to load file metadata')

    // const zipBuffer = await this.userFileAPI.loadFile(fileMeta.url)
    // const zipFiles = await jsZip.loadAsync(zipBuffer)
    // const fileText = await zipFiles
    //   .file(`${decodeURIComponent(fileMeta.name)}.json`)
    //   ?.async('text')
    // const doc = jsonParse(fileText) as S.Doc | undefined
    // if (doc) return doc

    // throw new Error('Failed to initialize doc')
  }

  async exportDoc(doc: S.Doc) {
    const fileName = `${doc.meta.name}.json`
    const blob = new TextEncoder().encode(JSON.stringify(doc))
    this.uploader.download(
      fileName,
      new File([blob], fileName, { type: 'application/json' }),
    )
  }
}
