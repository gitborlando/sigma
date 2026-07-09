import Scrollbars from 'react-custom-scrollbars-2'
import { DesignAlignComp } from 'src/view/editor/design/align'
import { EditorRPOperateFillComp } from 'src/view/editor/right-panel/operate/fill'
import { FillPickerComp } from 'src/view/editor/right-panel/operate/picker'
import { useEditorServices } from 'src/view/hooks/editor'
import { RightPanelDesignGeom } from '../design/geom'
import { useSelectIds } from 'src/view/hooks/schema/use-y-client'

export const OperatePanelComp: FC<{}> = observer(({}) => {
  const { fillPicker } = useEditorServices()
  const selectIdList = useSelectIds()

  if (!selectIdList.length) return null
  return (
    <Scrollbars>
      <RightPanelDesignGeom />
      <DesignAlignComp />
      <EditorRPOperateFillComp />
      <FillPickerComp x-if={fillPicker.isShowPicker} />
    </Scrollbars>
  )
})
