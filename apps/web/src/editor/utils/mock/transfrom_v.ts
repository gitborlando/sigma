import { MRect, createRegularPolygon } from 'src/editor/geometry'
import { SchemaCreator } from 'src/editor/schema/creator'

export function mock_transform_v(schemaCreator: SchemaCreator) {
  const schema = <S.Schema>{}

  const meta = schemaCreator.meta()
  const page = schemaCreator.page()
  schema.meta = meta
  schemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  const rect = schemaCreator.rect({
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  schemaCreator.addToSchema(schema, rect)
  schemaCreator.addChild(page, rect)

  const triangle = schemaCreator.path({
    ...MRect.identity(100, 100).shift(XY.$(300, 100)).plain(),
    points: createRegularPolygon(100, 100, 3),
  })
  schemaCreator.addToSchema(schema, triangle)
  schemaCreator.addChild(page, triangle)

  const pentagon = schemaCreator.path({
    ...MRect.identity(100, 100).shift(XY.$(500, 100)).plain(),
    points: createRegularPolygon(100, 100, 5),
  })
  schemaCreator.addToSchema(schema, pentagon)
  schemaCreator.addChild(page, pentagon)

  return schema
}
