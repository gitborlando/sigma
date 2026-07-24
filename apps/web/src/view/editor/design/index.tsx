import { withPrepare } from '@gitborlando/utils/react'
import Scrollbars from 'react-custom-scrollbars-2'
import { DesignAlignComp } from 'src/view/editor/design/align'
import { DesignFillComp } from 'src/view/editor/design/fill'
import { DesignStrokeComp } from 'src/view/editor/design/stroke'
import { DesignPickerComp } from 'src/view/editor/right-panel/operate/picker'
import { useSelectIds } from 'src/view/hooks/schema/use-y-client'
import { DesignGeomComp } from './geom'

export const DesignPanelComp = observer(
  withPrepare(
    () => {
      const selectIdList = useSelectIds()
      return selectIdList.length ? { selectIdList } : null
    },
    () => (
      <Scrollbars>
        <DesignAlignComp />
        <DesignGeomComp />
        <DesignFillComp />
        <DesignStrokeComp />
        <DesignPickerComp />
      </Scrollbars>
    ),
  ),
)
