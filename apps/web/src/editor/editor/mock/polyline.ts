import { SchemaCreator } from 'src/editor/schema/creator'

export function mockPolyline() {
  const schema = <ISchema>{}

  const meta = SchemaCreator.meta()
  const client = SchemaCreator.client()
  const page = SchemaCreator.page()

  const star = SchemaCreator.star()

  star.points = [
    SchemaCreator.point({ x: 0, y: 0, startPath: true }),
    SchemaCreator.point({ x: 20, y: 90 }),
    SchemaCreator.point({ x: 40, y: 60 }),
    SchemaCreator.point({ x: 90, y: 10, endPath: true }),
  ]
  star.fills = []
  star.strokes = [SchemaCreator.stroke()]

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
