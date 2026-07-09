import { Matrix } from 'src/editor/geometry'
import { rgbToRgba } from 'src/utils/color'
import { useEditorServices } from 'src/view/hooks/editor'
import { themeColor } from 'src/view/styles/color'

export const StageMarqueeComp: FC<{}> = observer(({}) => {
  const { stageSelect, schemaCreator, stageViewport } = useEditorServices()
  const zoom = stageViewport.zoom
  const { marquee } = stageSelect

  if (marquee.width <= 0 || marquee.height <= 0) {
    return null
  }

  const rect = schemaCreator.rect({
    id: 'marquee',
    ...marquee,
    strokes: [schemaCreator.solidStroke(themeColor(), 1 / zoom)],
    fills: [schemaCreator.fillColor(rgbToRgba(themeColor(55), 0.05))],
    matrix: Matrix.identity().shift(marquee),
  })

  return <elem node={rect} />
})
