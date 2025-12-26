import { SchemaCreator } from 'src/editor/schema/creator'

export function mock() {
  const schema = <V1.Schema>{}

  const meta = SchemaCreator.meta()
  const page = SchemaCreator.page()
  SchemaCreator.addToSchema(schema, meta)
  SchemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  const frame = SchemaCreator.frame({
    width: 500,
    height: 500,
    matrix: Matrix.identity().rotate(45),
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
    width: 60,
    height: 40,
    matrix: Matrix.identity().translate(200, 200).plain(),
  })
  SchemaCreator.addToSchema(schema, rect)
  SchemaCreator.addChild(frame, rect)

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
