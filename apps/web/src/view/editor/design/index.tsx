import { withPrepare } from '@gitborlando/utils/react'
import Scrollbars from 'react-custom-scrollbars-2'
import { DesignAlignComp } from 'src/view/editor/design/align'
import { DesignFillComp } from 'src/view/editor/design/fill'
import { DesignPickerComp } from 'src/view/editor/design/picker'
import { DesignStrokeComp } from 'src/view/editor/design/stroke'
import { useSelectIds } from 'src/view/hooks/schema/use-y-client'
import { DesignGeomComp } from './geom'

export const DesignPanelComp = observer(
  withPrepare(
    () => {
      const selectIds = useSelectIds()
      return selectIds.length ? { selectIds } : null
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
