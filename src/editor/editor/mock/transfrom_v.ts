import { SchemaCreator } from 'src/editor/schema/creator'

export function mock_transform_v() {
  const schema = <V1.Schema>{}

  const meta = SchemaCreator.meta()
  const page = SchemaCreator.page()
  SchemaCreator.addToSchema(schema, meta)
  SchemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  // const frame = SchemaCreator.frame({
  //   ...MRect.identity(500, 500).rotate(45).plain(),
  // })
  // SchemaCreator.addToSchema(schema, frame)
  // SchemaCreator.addChild(page, frame)

  // const line = SchemaCreator.line({
  //   x: 300,
  //   y: 300,
  //   rotation: 45,
  // })
  // SchemaCreator.addToSchema(schema, line)
  // SchemaCreator.addChild(frame, line)

  const rect = SchemaCreator.polygon({
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  SchemaCreator.addToSchema(schema, rect)
  SchemaCreator.addChild(page, rect)

  // const polygon = SchemaCreator.polygon({
  //   x: 300,
  //   y: 300,
  //   width: 100,
  //   height: 100,
  //   sides: 8,
  // })
  // SchemaCreator.addToSchema(schema, polygon)
  // SchemaCreator.addChild(frame, polygon)

  return schema
}
