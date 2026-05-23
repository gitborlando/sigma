import { EditorLeftPanelLayerNodeComp } from './node'
import { PageComp } from './page'

export const LayerComp: FC<{}> = observer(({}) => {
  return (
    <G vertical='auto 1fr' center>
      <PageComp />
      <EditorLeftPanelLayerNodeComp />
    </G>
  )
})
