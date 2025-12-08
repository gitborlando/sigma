import { iife, matchCase } from '@gitborlando/utils'
import { isLeftMouse } from '@gitborlando/utils/browser'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem'
import { StageSurface } from 'src/editor/render/surface'
import { SchemaCreator } from 'src/editor/schema/creator'
import { StageCursor } from 'src/editor/stage/cursor'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageMove } from 'src/editor/stage/interact/move'
import { StageTransformer } from 'src/editor/stage/tools/transformer'
import { getZoom, StageViewport } from 'src/editor/stage/viewport'
import { StageDrag } from 'src/global/event/drag'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'
import { themeColor } from 'src/view/styles/color'

let transformOBB = OBB.identityOBB()
let isSelectOnlyLine = false

export const EditorStageTransformComp: FC<{}> = observer(({}) => {
  const selectNodes = useSelectNodes()
  const shouldHidden =
    StageTransformer.isMoving || StageViewport.isZooming || StageMove.isMoving

  isSelectOnlyLine = selectNodes.length === 1 && selectNodes[0].type === 'line'
  StageTransformer.isSelectOnlyLine = isSelectOnlyLine

  transformOBB = useMemo(() => StageTransformer.calcOBB(selectNodes), [selectNodes])

  const node = SchemaCreator.rect({
    id: 'transform',
    fills: [],
    ...transformOBB,
  })

  const mousedown = (e: ElemMouseEvent) => {
    if (StageInteract.interaction !== 'select') return
    StageSurface.disablePointEvent(true)

    if (isLeftMouse(e.hostEvent)) {
      e.stopPropagation()
      StageTransformer.move(e.hostEvent)
    }
  }

  const [p0, p1, p2, p3] = transformOBB.vertexes

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
  })

  const rotatePointOBB = iife(() => {
    const offset = matchCase(type, {
      topLeft: XY._(-size, -size),
      topRight: XY._(size, -size),
      bottomRight: XY._(size, size),
      bottomLeft: XY._(-size, size),
    })
    const newXY = XY.from(xy).plus(offset).rotate(xy, transformOBB.rotation)
    return OBB.fromCenter(newXY, size, size, 0)
  })

  const rotatePoint = SchemaCreator.rect({
    id: `transform-rotatePoint-${type}`,
    ...rotatePointOBB,
    fills: [SchemaCreator.fillColor(COLOR.transparent)],
    radius: 2 / getZoom(),
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
                  rotation: Angle.fromTwoVector(end, current),
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
                  rotation: Angle.fromTwoVector(current, start),
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

  const handleRotatePointerHover = (e: ElemMouseEvent) => {
    if (!e.hovered) return StageCursor.setCursor('select')
    StageCursor.setCursor('rotate')
  }

  const handleRotatePointerMouseDown = (e: ElemMouseEvent) => {
    e.stopPropagation()

    StageCursor.setCursor('rotate').lock().upReset()

    const { center } = transformOBB
    let last: IXY
    StageDrag.onStart()
      .onMove(({ current, start }) => {
        if (!last) last = start
        const deltaRotation = XY.from(current).getAngle(last, center)
        last = current

        setActiveGeometry('rotation', deltaRotation)
      })
      .onDestroy(({ moved }) => {
        if (!moved) return
        YUndo.track({
          type: 'state',
          description: sentence(t('verb.rotate'), t('noun.node')),
        })
      })
  }

  return (
    <>
      <elem
        node={rect}
        events={{
          hover: mouseenter,
          mousemove: (e) => e.stopPropagation(),
          mousedown,
        }}
      />
      <elem
        x-if={!isSelectOnlyLine}
        node={rotatePoint}
        events={{
          hover: handleRotatePointerHover,
          mousedown: handleRotatePointerMouseDown,
          mousemove: (e) => e.stopPropagation(),
        }}
      />
    </>
  )
})
