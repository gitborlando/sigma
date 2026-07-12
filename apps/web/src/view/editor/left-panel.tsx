import { matchCase } from '@gitborlando/utils'
import { Layers } from 'lucide-react'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { LayerPanelComp } from 'src/view/editor/layer'
import { useEditorServices } from 'src/view/hooks/editor'

export const EditorLeftPanelIds = ['layer'] as const

export const EditorLeftPanelState = observable({
  currentTabId: T<(typeof EditorLeftPanelIds)[number]>('layer'),
})

export const LeftPanelComp: FC<{}> = observer(({}) => {
  const { stageViewport } = useEditorServices()
  const { currentTabId } = EditorLeftPanelState

  return (
    <G
      horizontal='auto'
      style={{ width: stageViewport.bound.left }}
      className={cls()}>
      <LayerPanelComp x-if={currentTabId === 'layer'} />
    </G>
  )
})

export const SwitchBarComp: FC<{}> = observer(({}) => {
  const { currentTabId } = EditorLeftPanelState

  return (
    <G center vertical className={cls('switchBar')} gap={8}>
      {EditorLeftPanelIds.map((id) => {
        const icon = matchCase(id, { layer: <Lucide icon={Layers} size={17} /> })
        return (
          <Btn
            key={id}
            icon={icon}
            active={currentTabId === id}
            onClick={() => (EditorLeftPanelState.currentTabId = id)}></Btn>
        )
      })}
    </G>
  )
})

const cls = classes(css`
  ${styles.borderRight}

  &-switchBar {
    width: 44px;
    align-content: start;
    padding-block: 8px;
    ${styles.borderRight}
  }
`)
