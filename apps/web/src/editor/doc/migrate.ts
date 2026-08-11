import { clone } from '@gitborlando/utils'
import {
  createGraphTraverse,
  type GraphTraverseContext,
} from 'src/editor/doc/traverse'

type Migration = {
  version: number
  desc: string
  transform: (ctx: GraphTraverseContext) => void
}

export function migrateDoc(doc: any) {
  const version = doc?.meta?.version

  const newDoc = clone(doc) as S.Doc
  const migrations = migrationList.slice(version)

  const traverse = createGraphTraverse({
    getDoc: () => newDoc,
    enter: (ctx) => migrations.forEach((m) => m.transform(ctx)),
  })
  traverse(newDoc.meta.pageIds)

  newDoc.meta.version = migrationList.length
  return newDoc
}

export function getLatestVersion() {
  return migrationList.length
}

export const migrationList = [] as Migration[]
