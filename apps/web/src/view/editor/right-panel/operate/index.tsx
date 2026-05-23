import Scrollbars from 'react-custom-scrollbars-2'
import { getSelectIdList } from 'src/editor/utils/get'
import { EditorRPOperateFillComp } from 'src/view/editor/right-panel/operate/fill'
import { FillPickerComp } from 'src/view/editor/right-panel/operate/picker'
import { FillPickerState } from 'src/view/editor/right-panel/operate/picker/state'
import { AlignComp } from './align'
import { EditorRightOperateGeo } from './geo'

export const OperatePanelComp: FC<{}> = observer(({}) => {
  const selectIdList = getSelectIdList()

  if (!selectIdList.length) return null
  return (
    <Scrollbars>
      <AlignComp />
      <EditorRightOperateGeo />
      <EditorRPOperateFillComp />
      <FillPickerComp x-if={FillPickerState.isShowPicker} />
    </Scrollbars>
  )
})
