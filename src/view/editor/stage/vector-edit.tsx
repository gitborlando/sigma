import { IXY, iife } from '@gitborlando/utils'
import { Container, Graphics } from '@pixi/react'
import { FC, Fragment, memo } from 'react'
import { OperateNode } from 'src/editor/operate/node'
import { Schema } from 'src/editor/schema/schema'
import { StageDraw } from 'src/editor/stage/draw/draw'
import { PIXI } from 'src/editor/stage/pixi'
import { getZoom } from 'src/editor/stage/viewport'
import { useMatchPatch, useMemoComp } from 'src/shared/utils/react'
import { useAutoSignal, useHookSignal } from 'src/utils/signal-react'
import {
  xy_getRotation,
  xy_minus,
  xy_opposite,
  xy_plus,
  xy_rotate,
} from 'young.xy-utils'
import { PointComp } from './point'

type IVectorEditComp = {}

export const VectorEditComp: FC<IVectorEditComp> = memo(({}) => {
  const { intoEditNodeId } = OperateNode
  useHookSignal(intoEditNodeId)

  const VectorEditContentComp = useMemoComp([intoEditNodeId.value], ({}) => {
    const zoom = getZoom()
    const node = Schema.find<INode>(intoEditNodeId.value)
    const curIndex = useAutoSignal()
    const curHandleIndex = useAutoSignal()

    // curIndex.intercept(() => (curHandleIndex.value = undefined))

    const points = iife(() => {
      if (node?.type === 'irregular') return node.points
      return []
    })

    useMatchPatch('/?/points/...')

    const EditorPointComp = useMemoComp<{ index: number; point: IPoint }>(
      [zoom, curIndex.value, curHandleIndex.value],
      ({ index, point }) => {
        const size = zoom < 1.5 ? 3 : 5
        const handleSize = zoom < 1.5 ? 2 : 3
        const { handleL: handleLeft, handleR: handleRight } = point
        const selected = index === curIndex.value

        const resetNodePoint = (keys: ISchemaPropKey[], value: any) => {
          Schema.itemReset(node, ['points', index, ...keys], value)
        }
        const afterReset = () => {
          Schema.finalOperation('编辑 point xy')
        }

        const resetPointXY = (shift: IXY) => {
          resetNodePoint(['x'], point.x + shift.x)
          resetNodePoint(['y'], point.y + shift.y)
          if (handleLeft) shiftHandleLeft(shift)
          if (handleRight) shiftHandleRight(shift)
          Schema.commitOperation('编辑 point xy')
          Schema.nextSchema()
        }

        const shiftHandleLeft = (shift: IXY) => {
          resetNodePoint(['handleLeft', 'x'], handleLeft!.x + shift.x)
          resetNodePoint(['handleLeft', 'y'], handleLeft!.y + shift.y)
        }
        const shiftHandleRight = (shift: IXY) => {
          resetNodePoint(['handleRight', 'x'], handleRight!.x + shift.x)
          resetNodePoint(['handleRight', 'y'], handleRight!.y + shift.y)
        }

        const resetHandleXY = (shift: IXY, isLeft: boolean) => {
          firstIf: if (isLeft) {
            shiftHandleLeft(shift)
            if (!handleRight) break firstIf
            if (point.symmetric === 'complete') shiftHandleRight(xy_opposite(shift))
            if (point.symmetric === 'angle') {
              const angle = xy_getRotation(
                xy_plus(shift, handleLeft!),
                handleLeft!,
                point,
              )
              const newHandleRight = xy_rotate(handleRight, point, angle)
              shiftHandleRight(xy_minus(newHandleRight, handleRight))
            }
          } else {
            shiftHandleRight(shift)
            if (point.symmetric === 'complete') shiftHandleLeft(xy_opposite(shift))
            if (point.symmetric === 'angle') {
              const angle = xy_getRotation(
                xy_plus(shift, handleRight!),
                handleRight!,
                point,
              )
              const newHandleLeft = xy_rotate(handleLeft!, point, angle)
              shiftHandleLeft(xy_minus(newHandleLeft, handleLeft!))
            }
          }
          Schema.commitOperation('编辑 point xy')
          Schema.nextSchema()
        }

        return (
          <>
            {[handleLeft, handleRight].map((handle, i) => {
              if (!handle || !selected) return null
              const handelSelected = i === curHandleIndex.value
              return (
                <Fragment key={i}>
                  <Graphics
                    draw={(g) => {
                      g.clear()
                      g.x = node.x
                      g.y = node.y
                      g.lineStyle(
                        1 / zoom,
                        handelSelected ? hslBlueColor(60) : '#9F9F9F',
                      )
                      g.moveTo(point.x, point.y)
                      g.lineTo(handle.x, handle.y)
                    }}
                  />
                  <PointComp
                    onChangeXY={(shift) => resetHandleXY(shift, i === 0)}
                    select={() => curHandleIndex.dispatch(i)}
                    onChangeEnd={afterReset}
                    draw={({ hovered }) =>
                      (g) => {
                        const fillColor = handelSelected
                          ? hslBlueColor(60)
                          : COLOR.white
                        const lineColor = handelSelected
                          ? COLOR.white
                          : hslBlueColor(60)
                        const rate = handelSelected || hovered ? 1.4 : 1
                        g.clear()
                        g.beginFill(fillColor)
                        g.lineStyle(rate / zoom, lineColor)
                        g.drawCircle(0, 0, (handleSize / zoom) * rate)
                        g.x = node.x + handle.x
                        g.y = node.y + handle.y
                        g.hitArea = {
                          contains: (x, y) =>
                            new PIXI.Circle(
                              0,
                              0,
                              (handleSize / zoom) * 1.2,
                            ).contains(x, y),
                        }
                      }}
                  />
                </Fragment>
              )
            })}
            <PointComp
              onChangeXY={resetPointXY}
              select={() => curIndex.dispatch(index)}
              onChangeEnd={afterReset}
              draw={({ hovered }) =>
                (g) => {
                  const fillColor = selected ? hslBlueColor(60) : COLOR.white
                  const lineColor = selected ? COLOR.white : hslBlueColor(60)
                  const rate = selected || hovered ? 1.4 : 1
                  g.clear()
                  g.beginFill(fillColor)
                  g.lineStyle(rate / zoom, lineColor)
                  g.drawCircle(0, 0, (size / zoom) * rate)
                  g.x = node.x + point.x
                  g.y = node.y + point.y
                  g.hitArea = {
                    contains: (x, y) =>
                      new PIXI.Circle(0, 0, (size / zoom) * 1.2).contains(x, y),
                  }
                }}
            />
          </>
        )
      },
    )

    const OutlinesComp = useMemoComp([zoom, node], ({}) => {
      return (
        <Graphics
          key={node.id}
          draw={(g) => {
            if (node.type === 'vector') {
              g.clear()
              g.lineStyle(0.5 / zoom, '#9F9F9F')
              StageDraw.drawShape(g, node)
            }
          }}
        />
      )
    })

    return (
      <Container>
        <OutlinesComp />
        {points.map((point, index) => (
          <EditorPointComp key={index} index={index} point={point} />
        ))}
      </Container>
    )
  })

  return intoEditNodeId.value && <VectorEditContentComp />
})

VectorEditComp.displayName = 'VectorEditComp'
