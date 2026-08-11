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
export class SchemaAction extends Service {
  private sessionFileId = ''

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

  async loadSchema(fileId: string) {
    return migrateDoc(await this.fetchSchema(fileId))
  }

  setupSchema(fileId: string, schema: S.Doc) {
    if (fileId === this.sessionFileId) return

    this.yDoc.setup(schema)
    setupDocGetter(() => this.yDoc.doc)

    this.yDoc.register(this.layerNodeTree.onYDocPatch)
    // this.yDoc.onPatch(this.nodeAction.onYDocPatch)

    // 开发中暂时不启用y-sync
    // this.ySync.init(fileId, this.yDoc.doc)
    // this.yAware.init({
    //   clientId: this.yDoc.doc.clientID,
    //   awareness: this.ySync.awareness,
    // })
    this.undo.setup()

    this.select.selectPage(schema.meta.pageIds[0])
    this.undo.mobxUndo.rebase()

    this.sessionFileId = fileId
    this.effect(() => (this.sessionFileId = ''))
  }

  private async fetchSchema(fileId: string) {
    if (fileId === 'mock') {
      const schema = mock_doc(this.docCreator)
      if (schema) return schema
      throw new Error('Failed to initialize mock schema')
    }

    const fileMeta = await FileService.getFileMeta(fileId)
    if (!fileMeta) throw new Error('Failed to load file metadata')

    const jsZip = new JSZip()
    const zipBuffer = await FileService.loadFile(fileMeta.url)
    const zipFiles = await jsZip.loadAsync(zipBuffer)
    const fileText = await zipFiles
      .file(`${decodeURIComponent(fileMeta.name)}.json`)
      ?.async('text')
    const schema = jsonParse(fileText) as S.Doc | undefined
    if (schema) return schema

    throw new Error('Failed to initialize schema')
  }
}
