import { Editor } from 'src/editor'

export function mockCollide(editor: Editor) {
  const schema = <S.Schema>{}

  const meta = editor.schemaCreator.meta()
  const page = editor.schemaCreator.page()
  editor.schemaCreator.addToSchema(schema, meta)
  editor.schemaCreator.addToSchema(schema, page)
  meta.pageIds.push(page.id)

  // const frame = editor.schemaCreator.frame()
  // frame.x = 100
  // frame.y = 100
  // frame.width = 500
  // frame.height = 500
  // editor.schemaCreator.addToSchema(schema, frame)
  // editor.schemaCreator.addChild(page, frame)

  // for (let i = 0; i < 3; i++) {
  //   const rect = editor.schemaCreator.rect()
  //   rect.x = 100 + i * 50
  //   rect.y = 100 + i * 50
  //   rect.width = 100
  //   rect.height = 100
  //   editor.schemaCreator.addToSchema(schema, rect)
  //   editor.schemaCreator.addChild(frame, rect)
  // }

  // const line = editor.schemaCreator.line({
  //   x: 300,
  //   y: 300,
  //   rotation: 45,
  // })
  // editor.schemaCreator.addToSchema(schema, line)
  // editor.schemaCreator.addChild(frame, line)

  const rect = editor.schemaCreator.rect({
    // x: 0.5,
    // y: -0.15,
    width: 6,
    height: 4,
    // rotation: 33,
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
