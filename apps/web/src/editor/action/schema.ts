import { jsonParse } from '@gitborlando/utils'
import JSZip from 'jszip'
import { NodeAction } from 'src/editor/action/node'
import { Undo } from 'src/editor/action/undo'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { migrateSchema } from 'src/editor/schema/migrate'
import { mock_schema } from 'src/editor/schema/mock'
import { setupSchemaTraverse } from 'src/editor/schema/traverse'
import { Select } from 'src/editor/select'
import { LayerNodeTree } from 'src/editor/workbench/layer/node-tree'
import { YAware } from 'src/editor/y-adapter/y-aware'
import { YState } from 'src/editor/y-adapter/y-state'
import { YSync } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'
import { FileService } from 'src/global/service/file'

@reflection
export class SchemaAction extends Service {
  private sessionFileId = ''

  constructor(
    private readonly schemaCreator: SchemaCreator,
    private readonly yState: YState,
    private readonly ySync: YSync,
    private readonly yAware: YAware,
    private readonly undo: Undo,
    private readonly select: Select,
    private readonly layerNodeTree: LayerNodeTree,
    private readonly nodeAction: NodeAction,
  ) {
    super()
    autoBind(this)
  }

  async loadSchema(fileId: string) {
    return migrateSchema(await this.fetchSchema(fileId))
  }

  setupSchema(fileId: string, schema: S.Schema) {
    if (fileId === this.sessionFileId) return

    this.yState.setup(schema)
    this.yState.register(this.layerNodeTree.onYStatePatch)
    // this.yState.onPatch(this.nodeAction.onYStatePatch)

    // 开发中暂时不启用y-sync
    // this.ySync.init(fileId, this.yState.doc)
    // this.yAware.init({
    //   clientId: this.yState.doc.clientID,
    //   awareness: this.ySync.awareness,
    // })
    this.undo.setup()

    SchemaHelper.setup({ find: this.yState.find })
    setupSchemaTraverse(() => this.yState.state)

    this.select.selectPage(schema.meta.pageIds[0])
    this.undo.mobxUndo.rebase()

    this.sessionFileId = fileId
    this.effect(() => (this.sessionFileId = ''))
  }

  private async fetchSchema(fileId: string) {
    if (fileId === 'mock') {
      const schema = mock_schema(this.schemaCreator)
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
    const schema = jsonParse(fileText) as S.Schema | undefined
    if (schema) return schema

    throw new Error('Failed to initialize schema')
  }
}
