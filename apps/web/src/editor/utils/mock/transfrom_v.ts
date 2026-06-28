import { MRect } from 'src/editor/geometry'
import { SchemaCreatorService } from 'src/editor/schema/creator'

export function mock_transform_v(schemaCreator: SchemaCreatorService) {
  const schema = <S.Schema>{}

  const meta = schemaCreator.meta()
  const page = schemaCreator.page()
  schemaCreator.addToSchema(schema, meta)
  schemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  // const frame = editor.schemaCreator.frame({
  //   ...MRect.identity(500, 500).rotate(45).plain(),
  // })
  // editor.schemaCreator.addToSchema(schema, frame)
  // editor.schemaCreator.addChild(page, frame)

  // const line = editor.schemaCreator.line({
  //   x: 300,
  //   y: 300,
  //   rotation: 45,
  // })
  // editor.schemaCreator.addToSchema(schema, line)
  // editor.schemaCreator.addChild(frame, line)

  const rect = schemaCreator.polygon({
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  schemaCreator.addToSchema(schema, rect)
  schemaCreator.addChild(page, rect)

  // const polygon = editor.schemaCreator.polygon({
  //   x: 300,
  //   y: 300,
  //   width: 100,
  //   height: 100,
  //   sides: 8,
  // })
  // editor.schemaCreator.addToSchema(schema, polygon)
  // editor.schemaCreator.addChild(frame, polygon)

  return schema
}
