import autobind from 'class-autobind-decorator'
import { nanoid } from 'nanoid'
import { ImmuiPatch } from 'src/shared/immui/immui'
import { Schema } from './schema'
import { ISchemaOperation } from './type'

@autobind
class SchemaHistoryService {
  stack = <ISchemaOperation[]>[]
  index$ = Signal.create(-1)
  patchList: ImmuiPatch[] = []

  get canUndo() {
    return this.index$.value >= 0
  }

  get canRedo() {
    return this.index$.value < this.stack.length - 1
  }

  private mergePatches = () => {
    const map = new Map<string, ImmuiPatch>()
    this.patchList.forEach((patch) => {
      if (!map.has(patch.path)) return map.set(patch.path, patch)
      patch.oldValue = map.get(patch.path)!.oldValue
      map.set(patch.path, patch)
    })
    return [...map.values()]
  }

  private makeOperation = (description?: string) => {
    const id = nanoid()
    const patches = this.mergePatches()
    Schema.save(patches)
    return { id, patches, description }
  }

  commit(description?: string) {
    if (this.index$.value !== this.stack.length - 1) {
      this.stack.splice(this.index$.value + 1)
    }
    this.stack.push(this.makeOperation(description))
    this.index$.dispatch(this.stack.length - 1)
    this.patchList.length = 0
  }

  undo() {
    YUndo.undo()
    return
    if (!this.canUndo) return
    const operation = this.stack[this.index$.value]
    this.replay('undo', operation)
    this.index$.dispatch(this.index$.value - 1)
  }

  redo() {
    YUndo.redo()
    return
    if (!this.canRedo) return
    const operation = this.stack[this.index$.value + 1]
    this.replay('redo', operation)
    this.index$.dispatch(this.index$.value + 1)
  }

  private replay(type: 'undo' | 'redo', { patches }: ISchemaOperation) {
    Schema.applyPatches(patches, { reverse: type === 'undo' })
    Schema.nextSchema()
    Schema.save(patches, true)
    this.patchList.length = 0
  }
}

export const SchemaHistory = new SchemaHistoryService()
