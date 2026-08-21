import { twoDecimal } from '@gitborlando/geo'
import { isLeftMouse, stopPropagation } from '@gitborlando/utils/browser'
import { clamp } from 'es-toolkit'
import { ceil } from 'es-toolkit/compat'
import hotkeys from 'hotkeys-js'
import { Fragment } from 'react'
import { Matrix, MRect } from 'src/editor/geometry'
import { ElemMouseEvent } from 'src/editor/render/elem/event'
import { TRBL } from 'src/editor/utils'
import { COLOR } from 'src/utils/color'
import { useSelectNodes } from 'src/view/hooks/use-doc'
import { useEditorServices } from 'src/view/hooks/use-services'
import { themeColor } from 'src/view/styles/color'

const arrayLoopGet = <T,>(arr: T[], index: number) => {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}

export const StageTransformComp: FC<{}> = observer(({}) => {
  const { docCreator, stageInteract, stageTransformer } = useEditorServices()
  const selectNodes = useSelectNodes()
  const { mrect } = stageTransformer

  useLayoutEffect(() => {
    stageTransformer.setup(selectNodes)
  }, [selectNodes])

  const node = docCreator.rect({ id: 'transform', fills: [], ...mrect.plain() })

  const mousedown = (e: ElemMouseEvent) => {
    if (stageInteract.interaction !== 'select') return

    if (isLeftMouse(e.hostEvent)) {
      e.stopPropagation()
      stageTransformer.onMove(e)
    }
  }

  if (selectNodes.length < 1 || stageTransformer.isMoving) {
    return null
  }

  if (stageTransformer.isSelectOneLine) {
    return (
      <elem x-if={selectNodes.length > 0} node={node} events={{ mousedown }}>
        <LineComp type='top' index={0} />
        <VertexComp type='top-left' index={0} />
        <VertexComp type='top-right' index={1} />
      </elem>
    )
  }

  return (
    <elem x-if={selectNodes.length > 0} node={node} events={{ mousedown }}>
      <LineComp type='top' index={0} />
      <LineComp type='right' index={1} />
      <LineComp type='bottom' index={2} />
      <LineComp type='left' index={3} />
      <VertexComp type='top-left' index={0} />
      <VertexComp type='top-right' index={1} />
      <VertexComp type='bottom-right' index={2} />
      <VertexComp type='bottom-left' index={3} />
      <RotatePointComp index={0} />
      <RotatePointComp index={1} />
      <RotatePointComp index={2} />
      <RotatePointComp index={3} />
      <SizeLabelComp />
    </elem>
  )
})

const LineComp: FC<{ type: TRBL; index: number }> = observer(({ type, index }) => {
  const { docCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const { width, height } = stageTransformer.mrect.plain()
  const mrect = MRect.identity(width, height)
  const p1 = arrayLoopGet(mrect.vertices, index)
  const p2 = arrayLoopGet(mrect.vertices, index + 1)

  const line = docCreator.line({
    id: `transform-line-${type}`,
    points: [docCreator.point(p1), docCreator.point(p2)],
    stroke: docCreator.solidStroke(themeColor(), 1 / zoom),
  })

  const hover = (e: ElemMouseEvent) => {
    if (!e.hovered) {
      return stageCursor.setCursor('select')
    }
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
      return stageTransformer.onMove(e)
    }
    stageTransformer.onResize([type], { e: e.hostEvent, shiftKey: hotkeys.shift })
  }

  return <elem node={line} events={{ hover, mousedown }} />
})

const VertexComp: FC<{
  type: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'
  index: number
}> = observer(({ type, index }) => {
  const { docCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const radius = 4 / zoom
  const { width, height } = stageTransformer.mrect.plain()

  const getMatrix = (x: number, y: number) => Matrix.identity().shift(XY.from(x, y))

  const matrix1 = getMatrix(-radius, -radius)
  const matrix2 = getMatrix(width - radius, -radius)
  const matrix3 = getMatrix(width - radius, height - radius)
  const matrix4 = getMatrix(-radius, height - radius)

  const rect = docCreator.rect({
    id: `transform-vertex-${type}`,
    radius: 2 / zoom,
    width: radius * 2,
    height: radius * 2,
    matrix: [matrix1, matrix2, matrix3, matrix4][index].plain(),
    stroke: docCreator.solidStroke(themeColor(), 1 / zoom),
    fills: [docCreator.fillColor(COLOR.white)],
  })

  const hover = stopPropagation((e: ElemMouseEvent) => {
    if (!e.hovered) {
      return stageCursor.setCursor('select')
    }
    if (stageTransformer.isSelectOneLine) {
      return stageCursor.setCursor('move')
    }
    const extraRotation = type === 'top-left' || type === 'bottom-right' ? 45 : -45
    stageCursor.setCursor('resize', stageTransformer.mrect.rotation + extraRotation)
  })

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    stageCursor.lock()
    stageTransformer.onResize(type.split('-') as TRBL[], {
      e: e.hostEvent,
      shiftKey: hotkeys.shift,
    })
  }

  return <elem node={rect} events={{ hover, mousedown }} />
})

const RotatePointComp: FC<{ index: number }> = observer(({ index }) => {
  const { docCreator, stageCursor, stageTransformer, stageViewport } =
    useEditorServices()
  const zoom = stageViewport.zoom
  const size = 12 / zoom
  const gap = 4 / zoom
  const { width, height } = stageTransformer.mrect.plain()

  const getMatrix = (x: number, y: number) => Matrix.identity().shift(XY.from(x, y))

  const matrix1 = getMatrix(-(gap + size), -(gap + size))
  const matrix2 = getMatrix(width + gap, -(gap + size))
  const matrix3 = getMatrix(width + gap, height + gap)
  const matrix4 = getMatrix(-(gap + size), height + gap)

  const ellipse = docCreator.ellipse({
    id: `transform-rotatePoint-${index}`,
    width: size,
    height: size,
    matrix: [matrix1, matrix2, matrix3, matrix4][index].plain(),
    fills: [docCreator.fillColor(COLOR.black, 0)],
  })

  const hover = (e: ElemMouseEvent) => {
    if (!e.hovered) return stageCursor.setCursor('select')
    stageCursor.setCursor('rotate')
  }

  const mousedown = (e: ElemMouseEvent) => {
    e.stopPropagation()
    stageCursor.setCursor('rotate').lock().upReset()
    stageTransformer.onRotate()
  }

  return <elem node={ellipse} events={{ hover, mousedown }} />
})

const FONT_SIZE = 11
const LINE_HEIGHT = 14
const TEXT_WIDTH = 54

const SizeLabelComp: FC<{}> = observer(({}) => {
  const { stageViewport, docCreator, stageTransformer, elemDrawer } =
    useEditorServices()
  const { zoom } = stageViewport
  const mrect = stageTransformer.mrect.plain()
  const { width, height } = mrect

  const label = `${twoDecimal(width)} × ${twoDecimal(height)}`
  const textWidth =
    elemDrawer.textBreaker?.measureWidth(
      label,
      `500 ${FONT_SIZE}px GoogleSansCode`,
    ) || TEXT_WIDTH
  const gap = 4 / zoom
  const labelWidth = ceil(textWidth + 6) / zoom
  const labelHeight = ceil(LINE_HEIGHT + 2) / zoom

  const getMatrix = (rotation: number, x: number, y: number) =>
    Matrix.identity().rotate(rotation).shift(XY.from(x, y))

  const matrix1 = getMatrix(0, (width - labelWidth) / 2, height + gap)
  const matrix2 = getMatrix(90, -gap, (height - labelWidth) / 2)
  const matrix3 = getMatrix(180, (width + labelWidth) / 2, -gap)
  const matrix4 = getMatrix(270, width + gap, (height + labelWidth) / 2)

  const matrix = [matrix1, matrix2, matrix3, matrix4].find((matrix) => {
    const rootMatrix = Matrix.of(mrect.matrix).append(matrix)
    const rotation = new MRect(1, 1, rootMatrix, 1).rotation
    return (
      clamp(rotation, 0, 45) === rotation || clamp(rotation, 315, 360) === rotation
    )
  })

  if (!matrix) return null

  const rect = docCreator.rect({
    id: 'transform-size-label-bg',
    width: labelWidth,
    height: labelHeight,
    matrix: matrix.plain(),
    radius: 4 / zoom,
    fills: [docCreator.fillColor(themeColor())],
  })

  const text = docCreator.text({
    id: 'transform-size-label',
    content: label,
    width: textWidth / zoom,
    height: LINE_HEIGHT / zoom,
    matrix: matrix.shift(XY.$(3 / zoom, 2 / zoom)).plain(),
    style: {
      fontSize: FONT_SIZE / zoom,
      fontWeight: 500,
      align: 'center',
      fontFamily: 'GoogleSansCode',
      fontStyle: 'normal',
      letterSpacing: 0,
      lineHeight: LINE_HEIGHT / zoom,
    },
    fills: [docCreator.fillColor(COLOR.white)],
  })

  return (
    <Fragment>
      <elem node={rect} />
      <elem node={text} />
    </Fragment>
  )
})
