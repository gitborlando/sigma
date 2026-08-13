import { DocCreator } from 'src/editor/doc/creator'
import { MRect, createRegularPolygon } from 'src/editor/geometry'

/** frame name */
export function mock_doc(docCreator: DocCreator) {
  const doc = docCreator.doc()
  const page = doc.graphs[doc.meta.pageIds[0]] as S.Page

  const rect = docCreator.frame({
    id: 'rect',
    ...MRect.identity(100, 100).shift(XY.$(100, 100)).plain(),
  })
  docCreator.addChild(doc, page, rect)

  const triangle = docCreator.path({
    id: 'triangle',
    ...MRect.identity(100, 100).shift(XY.$(300, 100)).plain(),
    points: createRegularPolygon(100, 100, 3),
  })
  docCreator.addChild(doc, page, triangle)

  const pentagon = docCreator.path({
    id: 'pentagon',
    ...MRect.identity(100, 100).shift(XY.$(500, 100)).plain(),
    points: createRegularPolygon(100, 100, 5),
  })
  docCreator.addChild(doc, page, pentagon)

  return doc
}
