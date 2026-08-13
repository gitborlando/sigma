import { jsonParse } from '@gitborlando/utils'
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
import { Service } from 'src/global/service'
import { FileService } from 'src/global/service/file'

@reflection
export class DocAction extends Service {
  private sessionId = ''

  constructor(
    private readonly docCreator: DocCreator,
    private readonly yDoc: YDoc,
    private readonly ySync: YSync,
    private readonly yAware: YAware,
    private readonly undo: Undo,
    private readonly select: Select,
    private readonly layerNodeTree: LayerNodeTree,
  ) {
    super()
    autoBind(this)
  }

  async loadDoc(id: string) {
    return migrateDoc(await this.fetchDoc(id))
  }

  setupDoc(id: string, doc: S.Doc) {
    if (id === this.sessionId) return

    this.yDoc.setup(doc)
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

    this.select.selectPage(doc.meta.pageIds[0])
    this.undo.mobxUndo.rebase()

    this.sessionId = id
    this.effect(() => (this.sessionId = ''))
  }

  private async fetchDoc(id: string) {
    if (id === 'mock') {
      const doc = mock_doc(this.docCreator)
      if (doc) return doc
      throw new Error('Failed to initialize mock doc')
    }

    const fileMeta = await FileService.getFileMeta(id)
    if (!fileMeta) throw new Error('Failed to load file metadata')

    const jsZip = new JSZip()
    const zipBuffer = await FileService.loadFile(fileMeta.url)
    const zipFiles = await jsZip.loadAsync(zipBuffer)
    const fileText = await zipFiles
      .file(`${decodeURIComponent(fileMeta.name)}.json`)
      ?.async('text')
    const doc = jsonParse(fileText) as S.Doc | undefined
    if (doc) return doc

    throw new Error('Failed to initialize doc')
  }

  async exportDoc(doc: S.Doc) {
    const fileName = `${doc.meta.name}.json`
    const blob = new TextEncoder().encode(JSON.stringify(doc))
    const blobUrl = URL.createObjectURL(
      new Blob([blob], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    a.click()
    URL.revokeObjectURL(blobUrl)
  }
}
