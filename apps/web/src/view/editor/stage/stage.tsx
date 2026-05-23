import { CSSProperties } from 'react'
import { renderElem } from 'src/editor/render/react/reconciler'
import { StageScene } from 'src/editor/render/scene'
import { EditorStageCursorsComp } from 'src/view/editor/stage/cursor'
import { FPSComp } from 'src/view/editor/stage/fps'
import { EditorStageMarqueeComp } from 'src/view/editor/stage/marquee'
import { EditorStageOutlineComp } from 'src/view/editor/stage/outline'
import { RulerComp } from 'src/view/editor/stage/ruler'
import { EditorStageSurfaceComp } from 'src/view/editor/stage/surface'
import { EditorStageTransformComp } from 'src/view/editor/stage/transform'

export const StageComp: FC<{}> = observer(({}) => {
  useEffect(() => {
    return renderElem(
      <>
        <EditorStageOutlineComp />
        <EditorStageTransformComp />
        <EditorStageMarqueeComp />
        <EditorStageCursorsComp />
      </>,
      StageScene.widgetRoot,
    )
  }, [])

  return (
    <G onContextMenu={(e) => e.preventDefault()}>
      <EditorStageSurfaceComp />
      <RulerComp />
      <FPSComp />
      <CooperateObservingBorderComp />
    </G>
  )
})

export const CooperateObservingBorderComp: FC<{}> = observer(({}) => {
  const { observingClientId: observingUserId } = YClients
  if (!observingUserId) return null

  const client = YClients.others[observingUserId]

  return (
    <G
      className={cls('cooperate-observing-border')}
      style={{ '--color': client.color } as CSSProperties}></G>
  )
})

const cls = classes(css`
  &-cooperate-observing-border {
    position: absolute;
    top: 0;
    left: 0;
    border: 2px solid var(--color);
  }
`)
