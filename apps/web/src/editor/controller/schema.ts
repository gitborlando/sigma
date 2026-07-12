import { jsonParse } from '@gitborlando/utils'
import JSZip from 'jszip'
import { Undo } from 'src/editor/core/undo'
import { HandleSelect } from 'src/editor/handle/select'
import { SchemaCreator } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { migrationSchema } from 'src/editor/schema/migration'
import { configureSchemaTraverse } from 'src/editor/schema/traverse'
import { mock_transform_v } from 'src/editor/utils/mock/transfrom_v'
import { YAware } from 'src/editor/y-adapter/y-aware'
import { YState } from 'src/editor/y-adapter/y-state'
import { YSync } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'
import { FileService } from 'src/global/service/file'

@reflection
export class SchemaController extends Service {
  private sessionFileId = ''

  constructor(
    private readonly schemaCreator: SchemaCreator,
    private readonly yState: YState,
    private readonly ySync: YSync,
    private readonly yAware: YAware,
    private readonly undo: Undo,
    private readonly handleSelect: HandleSelect,
  ) {
    super()
    autoBind(this)
  }

  async loadSchema(fileId: string) {
    return migrationSchema(await this.fetchSchema(fileId))
  }

  setupSchema(fileId: string, schema: S.Schema) {
    if (fileId === this.sessionFileId) return

    this.yState.init(schema)
    // 开发中暂时不启用y-sync
    // this.ySync.init(fileId, this.yState.doc)
    // this.yAware.init({
    //   clientId: this.yState.doc.clientID,
    //   awareness: this.ySync.awareness,
    // })

    SchemaHelper.init({ find: this.yState.find })
    configureSchemaTraverse(() => this.yState.schema)

    this.handleSelect.selectPage(schema.meta.pageIds[0])

    this.undo.init({
      stateMap: this.yState.doc.getMap('schema'),
      getPatches: this.yState.getPatches,
    })

    this.sessionFileId = fileId
  }

  private async fetchSchema(fileId: string) {
    if (fileId === 'mock') {
      const schema = mock_transform_v(this.schemaCreator)
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
