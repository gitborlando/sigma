import { LayerNodeTreeComp } from './node-tree'
import { LayerPageListComp } from './page-list'

export const LayerPanelComp: FC<{}> = observer(({}) => {
  return (
    <G vertical='auto 1fr' center>
      <LayerPageListComp />
      <LayerNodeTreeComp />
    </G>
  )
})
