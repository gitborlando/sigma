import { matchCase } from '@gitborlando/utils'
import { History, Image, Layers, Settings } from 'lucide-react'
import { StageViewport } from 'src/editor/stage/viewport'
import { Btn } from 'src/view/component/btn'

import { LayerComp } from 'src/view/editor/left-panel/panels/layer'

export const EditorLeftPanelIds = ['layer', 'undo', 'images', 'setting'] as const

export const EditorLeftPanelState = observable({
  currentTabId: T<(typeof EditorLeftPanelIds)[number]>('layer'),
})

export const LeftPanelComp: FC<{}> = observer(({}) => {
  const { currentTabId } = EditorLeftPanelState

  return (
    <G
      horizontal='auto'
      style={{ width: StageViewport.bound.left }}
      className={cls()}>
      <LayerComp x-if={currentTabId === 'layer'} />
    </G>
  )
})

export const SwitchBarComp: FC<{}> = observer(({}) => {
  const { currentTabId } = EditorLeftPanelState

  return (
    <G center vertical className={cls('switchBar')} gap={8}>
      {EditorLeftPanelIds.map((id) => {
        const icon = matchCase(id, {
          layer: <Lucide icon={Layers} size={17} />,
          undo: <Lucide icon={History} />,
          images: <Lucide icon={Image} />,
          setting: <Lucide icon={Settings} size={19} />,
        })
        const toolTip = matchCase(id, {
          layer: '图层',
          undo: '历史',
          images: '图片',
          setting: '设置',
        })
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
