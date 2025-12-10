import { SchemaCreator } from 'src/editor/schema/creator'
import { StageSelect } from 'src/editor/stage/interact/select'
import { getZoom } from 'src/editor/stage/viewport'
import { rgbToRgba } from 'src/utils/color'
import { themeColor } from 'src/view/styles/color'

export const EditorStageMarqueeComp: FC<{}> = observer(({}) => {
  const { marquee } = StageSelect

  if (marquee.width <= 0 || marquee.height <= 0) {
    return null
  }

  const rect = SchemaCreator.rect({
    id: 'marquee',
    ...marquee,
    strokes: [SchemaCreator.solidStroke(themeColor(), 1 / getZoom())],
    fills: [SchemaCreator.fillColor(rgbToRgba(themeColor(55), 0.05))],
    transform: Matrix.of(
      -0.9193906588630281,
      0.393345670365656,
      0.6043342843027781,
      -0.7967308659869083,
      5,
      0,
    ).tuple(),
  })

  return <elem node={rect} />
})
