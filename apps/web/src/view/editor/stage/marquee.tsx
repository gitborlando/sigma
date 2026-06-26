import { Matrix } from 'src/editor/geometry'
import { getZoom } from 'src/editor/utils/get'
import { rgbToRgba } from 'src/utils/color'
import { useEditor } from 'src/view/hooks/editor'
import { themeColor } from 'src/view/styles/color'

export const EditorStageMarqueeComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { marquee } = editor.stageSelect

  if (marquee.width <= 0 || marquee.height <= 0) {
    return null
  }

  const rect = editor.schemaCreator.rect({
    id: 'marquee',
    ...marquee,
    strokes: [editor.schemaCreator.solidStroke(themeColor(), 1 / getZoom(editor))],
    fills: [editor.schemaCreator.fillColor(rgbToRgba(themeColor(55), 0.05))],
    matrix: Matrix.identity().shift(marquee),
  })

  return <elem node={rect} />
})
