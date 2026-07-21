import { useEditorServices } from 'src/view/hooks/editor'
import { DesignPanelComp } from './design'

export const RightPanelComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()
  return (
    <G className={cls()} style={{ width: stageViewport.bound.right }}>
      <DesignPanelComp />
    </G>
  )
})

const cls = classes(css`
  border-left: 1px solid var(--gray-border);
`)
