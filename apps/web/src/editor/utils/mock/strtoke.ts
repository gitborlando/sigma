import { MRect } from 'src/editor/geometry'
import { SchemaCreator } from 'src/editor/schema/creator'

export function mock_stroke(schemaCreator: SchemaCreator) {
  const schema = <S.Schema>{}

  const meta = schemaCreator.meta()
  const page = schemaCreator.page()
  schema.meta = meta
  schemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  const rect = schemaCreator.rect({
    id: 'rect',
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
    stroke: schemaCreator.stroke({}),
  })
  schemaCreator.addToSchema(schema, rect)
  schemaCreator.addChild(page, rect)

  return schema
}
