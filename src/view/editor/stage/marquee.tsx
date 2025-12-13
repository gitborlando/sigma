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
    matrix: Matrix().shift(marquee).matrix,
  })

  return <elem node={rect} />
})
