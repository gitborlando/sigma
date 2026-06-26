import { useEditor } from 'src/view/hooks/editor'
import { OperatePanelComp } from './operate'

export const RightPanelComp: FC<{}> = observer(({}) => {
  const editor = useEditor()

  return (
    <G className={cls()} style={{ width: editor.stageViewport.bound.right }}>
      <OperatePanelComp />
    </G>
  )
})

const cls = classes(css`
  border-left: 1px solid var(--gray-border);
`)
