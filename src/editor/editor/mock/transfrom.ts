import { SchemaCreator } from 'src/editor/schema/creator'

export function mock() {
  const schema = <V1.Schema>{}

  const meta = SchemaCreator.meta()
  const page = SchemaCreator.page()
  SchemaCreator.addToSchema(schema, meta)
  SchemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  // const frame = SchemaCreator.frame()
  // frame.x = 100
  // frame.y = 100
  // frame.width = 500
  // frame.height = 500
  // SchemaCreator.addToSchema(schema, frame)
  // SchemaCreator.addChild(page, frame)

  // const line = SchemaCreator.line({
  //   x: 300,
  //   y: 300,
  //   rotation: 45,
  // })
  // SchemaCreator.addToSchema(schema, line)
  // SchemaCreator.addChild(frame, line)

  const rect = SchemaCreator.rect({
    // x: 0.5,
    // y: -0.15,
    width: 60,
    height: 40,
    // rotation: 33,

    matrix: Matrix([
      -0.9661300805096241, 0.2580555512568309, 0.6123004981473904,
      -0.7906251323911083, 0, 0,
    ]).matrix,
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
