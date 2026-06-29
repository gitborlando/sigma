import { useEditorService } from 'src/view/hooks/editor'
import { OperatePanelComp } from './operate'

export const RightPanelComp: FC<{}> = observer(({}) => {
  const stageViewport = useEditorService('stageViewport')

  return (
    <G className={cls()} style={{ width: stageViewport.bound.right }}>
      <OperatePanelComp />
    </G>
  )
})

const cls = classes(css`
  border-left: 1px solid var(--gray-border);
`)
