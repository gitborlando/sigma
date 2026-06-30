import Scrollbars from 'react-custom-scrollbars-2'
import { EditorRPOperateFillComp } from 'src/view/editor/right-panel/operate/fill'
import { FillPickerComp } from 'src/view/editor/right-panel/operate/picker'
import { useEditorService } from 'src/view/hooks/editor'
import { AlignComp } from './align'
import { EditorRightOperateGeo } from './geo'

export const OperatePanelComp: FC<{}> = observer(({}) => {
  const fillPicker = useEditorService('fillPicker')
  const selectIdList = useEditorService('handleSelect').selectIdList

  if (!selectIdList.length) return null
  return (
    <Scrollbars>
      <AlignComp />
      <EditorRightOperateGeo />
      <EditorRPOperateFillComp />
      <FillPickerComp x-if={fillPicker.isShowPicker} />
    </Scrollbars>
  )
})
