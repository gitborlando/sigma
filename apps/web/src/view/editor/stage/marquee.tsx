import { Matrix } from 'src/editor/geometry'
import { rgbToRgba } from 'src/utils/color'
import { useEditorServices } from 'src/view/hooks/use-services'
import { themeColor } from 'src/view/styles/color'

export const StageMarqueeComp: FC<{}> = observer(({}) => {
  const { stageSelect, docCreator, stageViewport } = useEditorServices()
  const zoom = stageViewport.zoom
  const { marquee } = stageSelect

  if (marquee.width <= 0 || marquee.height <= 0) {
    return null
  }

  const rect = docCreator.rect({
    id: 'marquee',
    ...marquee,
    stroke: docCreator.solidStroke(themeColor(), 1 / zoom),
    fills: [docCreator.fillColor(rgbToRgba(themeColor(55), 0.05))],
    matrix: Matrix.identity().shift(marquee),
  })

  return <elem node={rect} />
})
