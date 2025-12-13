import { iife } from '@gitborlando/utils'
import { isLeftMouse } from '@gitborlando/utils/browser'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { StageTransformer2 } from 'src/editor/stage/tools/transformer2'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { loopIndex } from 'src/editor/utils'
import { StageDrag } from 'src/global/event/drag'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

let transformOBB = OBB.identity()
let isSelectOnlyLine = false
let mrect = MRect.identity()

export const EditorStageTransformComp: FC<{}> = observer(({}) => {
  const selectNodes = useSelectNodes()
  const shouldHidden =
    StageTransformer.isMoving || StageViewport.isZooming || StageMove.isMoving

  isSelectOnlyLine = selectNodes.length === 1 && selectNodes[0].type === 'line'
  StageTransformer.isSelectOnlyLine = isSelectOnlyLine

  transformOBB = useMemo(() => StageTransformer.calcOBB(selectNodes), [selectNodes])

  mrect = useMemo(() => {
    return StageTransformer2.setup(selectNodes)
  }, [selectNodes])

  const node = SchemaCreator.rect({
    id: 'transform',
    fills: [],
    ...transformOBB,
    ...mrect,
  })

  const mousedown = (e: ElemMouseEvent) => {
    if (StageInteract.interaction !== 'select') return
    StageSurface.disablePointEvent(true)

    if (isLeftMouse(e.hostEvent)) {
      e.stopPropagation()
      StageTransformer.move(e.hostEvent)
    }
  }

  const [p0, p1, p2, p3] = mrect.vertexes

  return (
    <elem
      x-if={selectNodes.length > 0}
      hidden={shouldHidden}
      node={node}
      events={{ mousedown }}>
      <LineComp type='top' p1={p0} p2={p1} />
      <LineComp type='bottom' p1={p2} p2={p3} />
      <LineComp type='left' p1={p0} p2={p3} />
      <LineComp type='right' p1={p1} p2={p2} />
      <VertexComp type='topLeft' xy={p0} />
      <VertexComp type='topRight' xy={p1} />
      <VertexComp type='bottomRight' xy={p2} />
      <VertexComp type='bottomLeft' xy={p3} />
      <RotatePointComp xy={p0} index={0} />
      <RotatePointComp xy={p1} index={1} />
      <RotatePointComp xy={p2} index={2} />
      <RotatePointComp xy={p3} index={3} />
    </elem>
  )
})

const LineComp: FC<{ type: 'top' | 'bottom' | 'left' | 'right'; p1: IXY; p2: IXY }> =
  observer(({ type, p1, p2 }) => {
    const line = SchemaCreator.line({
      id: `transform-line-${type}`,
      points: [
        SchemaCreator.point({ x: p1.x, y: p1.y }),
        SchemaCreator.point({ x: p2.x, y: p2.y }),
      ],
      strokes: [SchemaCreator.solidStroke(themeColor(), 1 / getZoom())],
    })

    const mouseover = (e: ElemMouseEvent) => {
      if (!e.hovered) return StageCursor.setCursor('select')

      if (isSelectOnlyLine) {
        return StageCursor.setCursor('select')
      }

      switch (type) {
        case 'top':
        case 'bottom':
          return StageCursor.setCursor('resize', transformOBB.rotation + 90)
        case 'right':
        case 'left':
          return StageCursor.setCursor('resize', transformOBB.rotation)
      }
    }

    const mousedown = (e: ElemMouseEvent) => {
      StageCursor.lock()
      e.stopPropagation()
      StageTransformer.onDragLine(type, e.hostEvent)
    }

    return <elem node={line} events={{ hover: mouseover, mousedown }} />
  })

const VertexComp: FC<{
  type: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft'
  xy: IXY
}> = observer(({ type, xy }) => {
  const { setActiveGeometry, setActiveGeometries } = OperateGeometry
  const size = 8 / getZoom()
  const obb = OBB.fromCenter(xy, size, size, transformOBB.rotation)
  const selectedNodes = useSelectNodes()

  const rect = SchemaCreator.rect({
    id: `transform-vertex-${type}`,
    ...obb,
    strokes: [SchemaCreator.solidStroke(themeColor(), 1 / getZoom())],
    fills: [SchemaCreator.fillColor(COLOR.white)],
    radius: 2 / getZoom(),
    matrix: Matrix().translate(xy.x - size / 2, xy.y - size / 2).matrix,
  })

  const mouseenter = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')

    if (isSelectOnlyLine) {
      return StageCursor.setCursor('resize', transformOBB.rotation)
    }

    switch (type) {
      case 'topLeft':
      case 'bottomRight':
        return StageCursor.setCursor('resize', transformOBB.rotation + 45)
      case 'topRight':
      case 'bottomLeft':
        return StageCursor.setCursor('resize', transformOBB.rotation - 45)
    }
  }

  const moveVertex = (e: ElemMouseEvent) => {
    StageCursor.lock()
    const { rotation } = OperateGeometry.activeGeometry

    StageDrag.onStart()
      .onMove(({ delta, current }) => {
        const deltaX = XY.from(delta).getDot(XY.xAxis(rotation))
        const deltaY = XY.from(delta).getDot(XY.yAxis(rotation))

        if (isSelectOnlyLine) {
          current = StageViewport.toSceneXY(current)
          const line = selectedNodes[0] as V1.Line

          switch (type) {
            case 'topLeft':
            case 'bottomLeft': {
              const start = XY.from(line)
              const end = XY.of(line.width, 0).rotate(XY._(), rotation).plus(start)
              setActiveGeometries(
                {
                  x: current.x,
                  y: current.y,
                  width: XY.distanceOf(current, end),
                  rotation: Angle.sweep(XY.vectorOf(end, current)),
                },
                false,
              )
              break
            }
            case 'topRight':
            case 'bottomRight':
              const start = XY.from(line)
              setActiveGeometries(
                {
                  width: XY.distanceOf(current, start),
                  rotation: Angle.sweep(XY.vectorOf(current, start)),
                },
                false,
              )
              break
          }

          return
        }

        if (e.hostEvent.shiftKey) {
          switch (type) {
            case 'topLeft':
              setActiveGeometry(
                'x',
                -deltaY * Angle.sin(rotation) + deltaX * Angle.cos(rotation),
              )
              setActiveGeometry(
                'y',
                deltaX * Angle.sin(rotation) + deltaY * Angle.cos(rotation),
              )
              setActiveGeometry('width', -deltaX)
              setActiveGeometry('height', -deltaY)
              break
            case 'topRight':
              setActiveGeometry('x', -deltaY * Angle.sin(rotation))
              setActiveGeometry('y', deltaY * Angle.cos(rotation))
              setActiveGeometry('height', -deltaY)
              setActiveGeometry('width', deltaX)
              break
            case 'bottomRight':
              setActiveGeometry('width', deltaX)
              setActiveGeometry('height', deltaY)
              setActiveGeometry(
                'x',
                (-deltaY / 2) * Angle.sin(rotation) +
                  (-deltaX / 2) * Angle.cos(rotation),
              )
              setActiveGeometry(
                'y',
                (-deltaX / 2) * Angle.sin(rotation) +
                  (-deltaY / 2) * Angle.cos(rotation),
              )
              setActiveGeometry('width', -deltaX)
              setActiveGeometry('height', -deltaY)
              break
            case 'bottomLeft':
              setActiveGeometry('x', deltaX * Angle.cos(rotation))
              setActiveGeometry(
                'y',
                deltaX * Angle.sin(rotation) + Angle.cos(rotation),
              )
              setActiveGeometry('width', -deltaX)
              setActiveGeometry('height', deltaY)
              break
          }
        } else {
          switch (type) {
            case 'topLeft':
              setActiveGeometry(
                'x',
                -deltaY * Angle.sin(rotation) + deltaX * Angle.cos(rotation),
              )
              setActiveGeometry(
                'y',
                deltaX * Angle.sin(rotation) + deltaY * Angle.cos(rotation),
              )
              setActiveGeometry('width', -deltaX)
              setActiveGeometry('height', -deltaY)
              break
            case 'topRight':
              setActiveGeometry('x', -deltaY * Angle.sin(rotation))
              setActiveGeometry('y', deltaY * Angle.cos(rotation))
              setActiveGeometry('height', -deltaY)
              setActiveGeometry('width', deltaX)
              break
            case 'bottomRight':
              setActiveGeometry('width', deltaX)
              setActiveGeometry('height', deltaY)
              break
            case 'bottomLeft':
              setActiveGeometry('x', deltaX * Angle.cos(rotation))
              setActiveGeometry('y', deltaX * Angle.sin(rotation))
              setActiveGeometry('width', -deltaX)
              setActiveGeometry('height', deltaY)
              break
          }
        }
      })
      .onDestroy(({ moved }) => {
        if (!moved) return
        YUndo.track({
          type: 'state',
          description: sentence(t('verb.scale'), t('noun.node')),
        })
      })
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    moveVertex(e)
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

const RotatePointComp: FC<{
  xy: IXY
  index: number
}> = observer(({ xy, index }) => {
  let p1 = mrect.vertexes[loopIndex(mrect.vertexes, index + 1)]
  let p2 = mrect.vertexes[loopIndex(mrect.vertexes, index - 1)]

  if (Matrix.isFlipped(mrect.matrix)) [p1, p2] = [p2, p1]

  const sweep = Angle.minor(Angle.sweep(XY.vectorOf(p1, xy), XY.vectorOf(p2, xy)))
  const p1_ = XY.from(p1).rotate(xy, sweep / 2)

  const distance = XY.distanceOf(p1_, xy)
  const offset = XY.lerpOf(xy, p1_, 16 / getZoom() / distance)

  const size = 8 / getZoom()
  const rotatePointMatrix = iife(() => {
    return Matrix.identity()
      .translate(offset.x, offset.y)
      .translate(-size / 2, -size / 2)
      .tuple()
  })

  const rotatePoint = SchemaCreator.ellipse({
    id: `transform-rotatePoint-${index}`,
    fills: [SchemaCreator.fillColor(COLOR.pinkRed)],
    width: size,
    height: size,
    matrix: rotatePointMatrix,
  })

  const { setActiveGeometry } = OperateGeometry

  const handleRotatePointerHover = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')
    StageCursor.setCursor('rotate')
  }

  const handleRotatePointerMouseDown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    StageCursor.setCursor('rotate').lock().upReset()

    let last: IXY
    const center = transformOBB.center
    StageDrag.onStart()
      .onMove(({ current, start }) => {
        if (!last) last = start
        const deltaRotation = Angle.sweep(
          XY.vectorOf(current, center),
          XY.vectorOf(last, center),
        )
        setActiveGeometry('rotation', deltaRotation)
        last = current
      })
      .onDestroy(({ moved }) => {
        if (!moved) return
        YUndo.track2('state', t('transformer rotated'))
      })
  }

  return (
    <elem
      node={rotatePoint}
      events={{
        hover: handleRotatePointerHover,
        mousedown: handleRotatePointerMouseDown,
      }}
    />
  )
})
