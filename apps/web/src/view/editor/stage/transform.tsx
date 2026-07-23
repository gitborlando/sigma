import { isLeftMouse } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { Matrix, MRect } from 'src/editor/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { arrayLoopGet, TRBL } from 'src/editor/utils/misc'
import { COLOR } from 'src/utils/color'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

export const StageTransformComp: FC<{}> = observer(({}) => {
  const {
    schemaCreator,
    stageInteract,
    stageEvent,
    stageMove,
    stageTransformer,
    stageViewport,
  } = useEditorServices()
  const selectNodes = useSelectNodes()
  const { mrect, isMoving } = stageTransformer
  const shouldHidden = isMoving || stageViewport.isZooming || stageMove.isMoving

  useLayoutEffect(() => {
    stageTransformer.setup(selectNodes)
  }, [selectNodes, stageTransformer])

  const node = schemaCreator.rect({ id: 'transform', fills: [], ...mrect.plain() })

  const mousedown = (e: ElemMouseEvent) => {
    if (stageInteract.interaction !== 'select') return

    stageEvent.disablePointEvent(true)
    if (isLeftMouse(e.hostEvent)) {
      e.stopPropagation()
      stageTransformer.onMove(e.hostEvent)
    }
  }

  if (stageTransformer.isSelectOneLine) {
    return (
      <elem
        x-if={selectNodes.length > 0}
        hidden={shouldHidden}
        node={node}
        events={{ mousedown }}>
        <LineComp type='top' index={0} />
        <VertexComp type='topLeft' index={0} directions={['left']} />
        <VertexComp type='topRight' index={1} directions={['right']} />
      </elem>
    )
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
  const { schemaCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const { width, height } = stageTransformer.mrect.plain()
  const mrect = MRect.identity(width, height)
  const p1 = arrayLoopGet(mrect.vertices, index)
  const p2 = arrayLoopGet(mrect.vertices, index + 1)

  const line = schemaCreator.line({
    id: `transform-line-${type}`,
    points: [schemaCreator.point(p1), schemaCreator.point(p2)],
    stroke: schemaCreator.solidStroke(themeColor(), 1 / zoom),
  })

  const mouseover = (e: ElemMouseEvent) => {
    if (!e.hovered) return stageCursor.setCursor('select')

    if (stageTransformer.isSelectOneLine) {
      return stageCursor.setCursor('select')
    }

    const extraRotation = type === 'top' || type === 'bottom' ? 90 : 0
    stageCursor.setCursor('resize', stageTransformer.mrect.rotation + extraRotation)
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    stageCursor.lock()
    if (stageTransformer.isSelectOneLine) {
      return stageTransformer.onMove(e.hostEvent)
    }
    stageTransformer.onResize([type], { e: e.hostEvent, shiftKey: hotkeys.shift })
  }

  return <elem node={line} events={{ hover: mouseover, mousedown }} />
})

const VertexComp: FC<{
  type: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
  index: number
  directions: TRBL[]
}> = observer(({ type, index, directions }) => {
  const { schemaCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const { width, height } = stageTransformer.mrect.plain()
  const mrect = MRect.identity(width, height)
  const xy = arrayLoopGet(mrect.vertices, index)
  const size = 8 / zoom

  const vertexMRect = MRect.of({
    width: size,
    height: size,
    aspectRatio: -1,
    matrix: Matrix.identity().shift(XY.of(xy).plusNum(-size / 2)),
  })
  vertexMRect.rotate(mrect.rotation)

  const rect = schemaCreator.rect({
    id: `transform-vertex-${type}`,
    stroke: schemaCreator.solidStroke(themeColor(), 1 / zoom),
    fills: [schemaCreator.fillColor(COLOR.white)],
    radius: 2 / zoom,
    ...vertexMRect.plain(),
  })

  const mouseenter = (e: ElemMouseEvent) => {
    if (!e.hovered) return stageCursor.setCursor('select')

    if (stageTransformer.isSelectOneLine) {
      return stageCursor.setCursor('resize', mrect.rotation)
    }

    const extraRotation = type === 'topLeft' || type === 'bottomRight' ? 45 : -45
    stageCursor.setCursor('resize', stageTransformer.mrect.rotation + extraRotation)
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    stageCursor.lock()
    stageTransformer.onResize(directions, {
      e: e.hostEvent,
      shiftKey: hotkeys.shift,
    })
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
  const { schemaCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const { width, height } = stageTransformer.mrect.plain()
  const mrect = MRect.identity(width, height)
  const xy = arrayLoopGet(mrect.vertices, index)
  const size = 8 / zoom

  let p1 = arrayLoopGet(mrect.vertices, index + 1)
  let p2 = arrayLoopGet(mrect.vertices, index - 1)
  if (Matrix.isFlipped(mrect.matrix)) [p1, p2] = [p2, p1]

  const sweep = Angle.minor(Angle.sweep(XY.vector(xy, p1), XY.vector(xy, p2)))
  const p1_ = XY.of(p1).rotate(xy, sweep / 2)
  const offset = XY.lerp(xy, p1_, 16 / zoom)
  const matrix = Matrix.identity().shift(XY.of(offset).plusNum(-size / 2))

  const rotatePoint = schemaCreator.ellipse({
    id: `transform-rotatePoint-${index}`,
    fills: [schemaCreator.fillColor(COLOR.black, 0)],
    width: size,
    height: size,
    matrix: matrix,
  })

  const mouseenter = (e: ElemMouseEvent) => {
    if (!e.hovered) return stageCursor.setCursor('select')
    stageCursor.setCursor('rotate')
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    stageCursor.setCursor('rotate').lock().upReset()
    stageTransformer.onRotate()
  }

  return <elem node={rotatePoint} events={{ hover: mouseenter, mousedown }} />
})
