import { Editor } from 'src/editor'
import { MRect } from 'src/editor/geometry'

export function mock_transform_v(editor: Editor) {
  const schema = <S.Schema>{}

  const meta = editor.schemaCreator.meta()
  const page = editor.schemaCreator.page()
  editor.schemaCreator.addToSchema(schema, meta)
  editor.schemaCreator.addToSchema(schema, page)
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

  const rect = editor.schemaCreator.polygon({
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  editor.schemaCreator.addToSchema(schema, rect)
  editor.schemaCreator.addChild(page, rect)

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
