import { StageViewport } from 'src/editor/stage/viewport'
import { OperatePanelComp } from './operate'

export const RightPanelComp: FC<{}> = ({}) => {
  return (
    <G className={cls()} style={{ width: StageViewport.bound.right }}>
      <OperatePanelComp />
    </G>
  )
}

const cls = classes(css`
  border-left: 1px solid var(--gray-border);
`)
