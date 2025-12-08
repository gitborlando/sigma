import { SchemaCreator } from 'src/editor/schema/creator'

export function mock() {
  const schema = <V1.Schema>{}

  const meta = SchemaCreator.meta()
  const page = SchemaCreator.page()
  SchemaCreator.addToSchema(schema, meta)
  SchemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  const frame = SchemaCreator.frame({
    ...MRect.identity(500, 500).rotate(45).plain(),
  })
  SchemaCreator.addToSchema(schema, frame)
  SchemaCreator.addChild(page, frame)

  // const line = SchemaCreator.line({
  //   x: 300,
  //   y: 300,
  //   rotation: 45,
  // })
  // SchemaCreator.addToSchema(schema, line)
  // SchemaCreator.addChild(frame, line)

  const rect = SchemaCreator.rect({
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  SchemaCreator.addToSchema(schema, rect)
  SchemaCreator.addChild(frame, rect)

  const rect2 = SchemaCreator.rect({
    ...MRect.identity(100, 100).shift(XY.$(200, 200)).plain(),
  })
  SchemaCreator.addToSchema(schema, rect2)
  SchemaCreator.addChild(frame, rect2)

  const rect3 = SchemaCreator.rect({
    ...MRect.identity(100, 100).shift(XY.$(200, 0)).plain(),
  })
  SchemaCreator.addToSchema(schema, rect3)
  SchemaCreator.addChild(frame, rect3)

  const line = SchemaCreator.rect({
    ...MRect.identity(100, 0).shift(XY.$(400, 100)).plain(),
  })
  SchemaCreator.addToSchema(schema, line)
  SchemaCreator.addChild(frame, line)

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
