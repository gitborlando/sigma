import { DocCreator } from 'src/editor/doc/creator'
import { MRect, createRegularPolygon } from 'src/editor/geometry'

/** frame name */
export function mock_doc(docCreator: DocCreator) {
  const schema = docCreator.schema()
  const page = schema.graphs[schema.meta.pageIds[0]] as S.Page

  const rect = docCreator.frame({
    id: 'rect',
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  docCreator.addChild(schema, page, rect)

  const triangle = docCreator.path({
    id: 'triangle',
    ...MRect.identity(100, 100).shift(XY.$(300, 100)).plain(),
    points: createRegularPolygon(100, 100, 3),
  })
  docCreator.addChild(schema, page, triangle)

  const pentagon = docCreator.path({
    id: 'pentagon',
    ...MRect.identity(100, 100).shift(XY.$(500, 100)).plain(),
    points: createRegularPolygon(100, 100, 5),
  })
  docCreator.addChild(schema, page, pentagon)

  return schema
}
