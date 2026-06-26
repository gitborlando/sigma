import { EditorService2 } from 'src/editor'

export function mockPolyline(editor: EditorService2) {
  const schema = <S.Schema>{}

  const meta = editor.schemaCreator.meta()
  const client = editor.schemaCreator.client()
  const page = editor.schemaCreator.page()

  const star = editor.schemaCreator.star()

  star.points = [
    editor.schemaCreator.point({ x: 0, y: 0, startPath: true }),
    editor.schemaCreator.point({ x: 20, y: 90 }),
    editor.schemaCreator.point({ x: 40, y: 60 }),
    editor.schemaCreator.point({ x: 90, y: 10, endPath: true }),
  ]
  star.fills = []
  star.strokes = [editor.schemaCreator.stroke()]

  schema.meta = meta
  schema.client = client

  schema[star.id] = star
  schema[page.id] = page

  page.childIds.push(star.id)
  meta.pageIds.push(page.id)
  client.selectPageId = page.id

  console.log(schema)
  return schema
}
