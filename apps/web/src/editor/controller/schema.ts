import { jsonParse } from '@gitborlando/utils'
import JSZip from 'jszip'
import { UndoService } from 'src/editor/core/undo'
import { HandleSelectService } from 'src/editor/handle/select'
import { SchemaCreatorService } from 'src/editor/schema/creator'
import { SchemaHelper } from 'src/editor/schema/helper'
import { migrationSchema } from 'src/editor/schema/migration'
import { mock_transform_v } from 'src/editor/utils/mock/transfrom_v'
import { YAwareService } from 'src/editor/y-adapter/y-aware'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { YSyncService } from 'src/editor/y-adapter/y-sync'
import { Service } from 'src/global/service'
import { FileService } from 'src/global/service/file'

export class SchemaController extends Service {
  private loadingFileId = ''

  constructor(
    private readonly schemaCreator: SchemaCreatorService,
    private readonly yState: YStateService,
    private readonly ySync: YSyncService,
    private readonly yAware: YAwareService,
    private readonly undo: UndoService,
    private readonly handleSelect: HandleSelectService,
  ) {
    super()
    autoBind(this)
  }

  async initSchemaSession(fileId: string) {
    this.loadingFileId = fileId

    const schema = migrationSchema(await this.loadSchema(fileId))
    if (this.loadingFileId !== fileId) return

    this.yState.init(schema)
    this.ySync.init(fileId, this.yState.doc)
    this.yAware.init({
      clientId: this.yState.doc.clientID,
      awareness: this.ySync.awareness,
    })
    this.undo.initUndo({
      stateMap: this.yState.doc.getMap('schema'),
      getPatches: this.yState.getPatches,
    })
    SchemaHelper.init({ find: this.yState.find })
    this.handleSelect.selectPage(schema.meta.pageIds[0])
  }

  private async loadSchema(fileId: string) {
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
