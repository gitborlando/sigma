import { isLeftMouse } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { arrayLoopGet, TRBL } from 'src/editor/utils'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

let isSelectOnlyLine = false

export const EditorStageTransformComp: FC<{}> = observer(({}) => {
  const selectNodes = useSelectNodes()
  const { mrect, isMoving } = StageTransformer
  const shouldHidden = isMoving || StageViewport.isZooming || StageMove.isMoving

  isSelectOnlyLine = selectNodes.length === 1 && selectNodes[0].type === 'line'
  StageTransformer.isSelectOnlyLine = isSelectOnlyLine

  useLayoutEffect(() => {
    StageTransformer.setup(selectNodes)
  }, [selectNodes])

  const node = SchemaCreator.rect({
    id: 'transform',
    fills: [],
    width: mrect.width,
    height: mrect.height,
    matrix: Matrix.identity(),
  })

  const mousedown = (e: ElemMouseEvent) => {
    if (StageInteract.interaction !== 'select') return

    StageSurface.disablePointEvent(true)
    if (isLeftMouse(e.hostEvent)) {
      e.stopPropagation()
      StageTransformer.move(e.hostEvent)
    }
  }

  return (
    <elem
      x-if={selectNodes.length > 0}
      hidden={shouldHidden}
      node={node}
      events={{ mousedown }}>
      <LineComp type='top' index={0} />
      <LineComp type='right' index={1} />
      <LineComp type='bottom' index={2} />
      <LineComp type='left' index={3} />
      <VertexComp type='topLeft' index={0} directions={['top', 'left']} />
      <VertexComp type='topRight' index={1} directions={['top', 'right']} />
      <VertexComp type='bottomRight' index={2} directions={['bottom', 'right']} />
      <VertexComp type='bottomLeft' index={3} directions={['bottom', 'left']} />
      <RotatePointComp index={0} />
      <RotatePointComp index={1} />
      <RotatePointComp index={2} />
      <RotatePointComp index={3} />
    </elem>
  )
})

const LineComp: FC<{ type: TRBL; index: number }> = observer(({ type, index }) => {
  const mrect = StageTransformer.mrect.clone()
  const p1 = arrayLoopGet(mrect.vertices, index)
  const p2 = arrayLoopGet(mrect.vertices, index + 1)

  const line = SchemaCreator.line({
    id: `transform-line-${type}`,
    points: [SchemaCreator.point(p1), SchemaCreator.point(p2)],
    strokes: [SchemaCreator.solidStroke(themeColor(), 1 / getZoom())],
  })

  const mouseover = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')

    if (isSelectOnlyLine) {
      return StageCursor.setCursor('select')
    }

    const extraRotation = type === 'top' || type === 'bottom' ? 90 : 0
    StageCursor.setCursor('resize', mrect.rotation + extraRotation)
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    StageCursor.lock()
    StageTransformer.onResize([type], { shiftKey: hotkeys.shift })
  }

  return <elem node={line} events={{ hover: mouseover, mousedown }} />
})

const VertexComp: FC<{
  type: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
  index: number
  directions: TRBL[]
}> = observer(({ type, index, directions }) => {
  const mrect = StageTransformer.mrect
  const xy = arrayLoopGet(mrect.vertices, index)
  const size = 8 / getZoom()

  const vertexMRect = MRect.of({
    width: size,
    height: size,
    matrix: Matrix.identity().shift(XY.of(xy).plusNum(-size / 2)),
  })
  vertexMRect.rotate(mrect.rotation)

  const rect = SchemaCreator.rect({
    id: `transform-vertex-${type}`,
    strokes: [SchemaCreator.solidStroke(themeColor(), 1 / getZoom())],
    fills: [SchemaCreator.fillColor(COLOR.white)],
    radius: 2 / getZoom(),
    ...vertexMRect.plain(),
  })

  const mouseenter = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')

    if (isSelectOnlyLine) {
      return StageCursor.setCursor('resize', mrect.rotation)
    }

    const extraRotation = type === 'topLeft' || type === 'bottomRight' ? 45 : -45
    StageCursor.setCursor('resize', mrect.rotation + extraRotation)
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    StageCursor.lock()
    StageTransformer.onResize(directions, { shiftKey: hotkeys.shift })
  }

  return (
    <elem
      node={rect}
      events={{
        hover: mouseenter,
        mousemove: (e) => e.stopPropagation(),
        mousedown,
      }}
    />
  )
})

const RotatePointComp: FC<{ index: number }> = observer(({ index }) => {
  const mrect = StageTransformer.mrect
  const xy = arrayLoopGet(mrect.vertices, index)
  const size = 8 / getZoom()

  let p1 = arrayLoopGet(mrect.vertices, index + 1)
  let p2 = arrayLoopGet(mrect.vertices, index - 1)
  if (Matrix.isFlipped(mrect.matrix)) [p1, p2] = [p2, p1]

  const sweep = Angle.minor(Angle.sweep(XY.vector(xy, p1), XY.vector(xy, p2)))
  const p1_ = XY.of(p1).rotate(xy, sweep / 2)
  const offset = XY.lerp(xy, p1_, 16 / getZoom())
  const matrix = Matrix.identity().shift(XY.of(offset).plusNum(-size / 2))

  const rotatePoint = SchemaCreator.ellipse({
    id: `transform-rotatePoint-${index}`,
    fills: [SchemaCreator.fillColor(COLOR.transparent)],
    width: size,
    height: size,
    matrix: matrix,
  })

  const mouseenter = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')
    StageCursor.setCursor('rotate')
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    StageCursor.setCursor('rotate').lock().upReset()
    StageTransformer.onRotate()
  }

  return (
    <elem
      node={rotatePoint}
      events={{
        hover: mouseenter,
        mousedown,
      }}
    />
  )
})
