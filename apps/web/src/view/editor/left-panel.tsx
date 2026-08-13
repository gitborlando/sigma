import { LayerPanelComp } from 'src/view/editor/layer'
import { useEditorServices } from 'src/view/hooks/use-editor'

export const LeftPanelComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()

  return (
    <G
      horizontal='auto'
      style={{ width: stageViewport.bound.left }}
      className={cls()}>
      <LayerPanelComp />
    </G>
  )
})

const cls = classes(css`
  ${styles.borderRight}
`)
