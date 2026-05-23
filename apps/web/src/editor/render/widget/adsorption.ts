import { createCache, iife } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { IValueWillChange } from 'mobx'
import { Graphics } from 'pixi.js'
import { abs, max, min, sqrt } from 'src/editor/math/base'
import { OBB } from 'src/editor/math/obb'
import { OperateGeometry } from 'src/editor/operate/geometry'
import { OperateMeta } from 'src/editor/operate/meta'
import { OperateNode } from 'src/editor/operate/node'
import { Schema } from 'src/editor/schema/schema'
import { isNumberEqual } from 'src/editor/utils/misc'
import { SchemaUtil } from 'src/shared/utils/schema'
import { Pixi } from '../pixi'
import { StageViewport } from '../viewport'
import { StageTransform } from './transform'

@autobind
class StageWidgetAdsorptionService {
  adsorptionElement = new Graphics()
  hAdsorptionMap = createCache<number, number[]>()
  vAdsorptionMap = createCache<number, number[]>()
  sortedAdsorptionX = <number[]>[]
  sortedAdsorptionY = <number[]>[]
  toDrawHLines = <{ y: number; xs: number[] }[]>[]
  toDrawVLines = <{ x: number; ys: number[] }[]>[]
  private cloneTransformOBB = new OBB(0, 0, 0, 0, 0)
  private needDraw = false
  initHook() {
    // OperateGeometry.beforeOperate.hook(() => this.setupAdsorption())
    // OperateGeometry.isChangedGeometry.hook({ id: 'adsorption' }, this.adsorption)
    // OperateGeometry.afterOperate.hook(() => (this.needDraw = false))
    // OperateNode.afterFlushDirty.hook({ after: 'operateGeometryReset' }, this.autoDraw)
    // OperateNode.afterFlushDirty.hook({ after: 'calcTransformOBB' }, this.updateCloneTransformOBB)
  }
  private updateCloneTransformOBB() {
    const { centerX, centerY, width, height, rotation } = StageTransform.transformOBB
    this.cloneTransformOBB = new OBB(centerX, centerY, width, height, rotation)
  }
  private setupAdsorption() {
    this.updateCloneTransformOBB()
    if (
      OperateNode.datumId.value === '' ||
      SchemaUtil.isPageById(OperateNode.datumId.value)
    ) {
      OperateMeta.curPage.value.childIds.forEach((id) => {
        if (OperateNode.selectIds.value.has(id)) return
        this.collectAdsorption(OperateNode.getNodeRuntime(id))
      })
    } else {
      const node = Schema.find(OperateNode.datumId.value) as IFrame
      ;[node.id, ...node.childIds].forEach((id) => {
        if (OperateNode.selectIds.value.has(id)) return
        this.collectAdsorption(OperateNode.getNodeRuntime(id))
      })
    }
    this.sortedAdsorptionX = [...this.vAdsorptionMap.keys()].sort()
    this.sortedAdsorptionY = [...this.hAdsorptionMap.keys()].sort()
  }
  private adsorption() {
    this.cloneTransformOBB.shiftX(
      OperateGeometry.activeGeometry.x - this.cloneTransformOBB.xy.x,
    )
    this.cloneTransformOBB.shiftY(
      OperateGeometry.activeGeometry.y - this.cloneTransformOBB.xy.y,
    )
    if (key === 'y' /* || key === 'height' */) this.horizontalAdsorption(key, ctx)
    if (key === 'x' /* || key === 'width' */) this.verticalAdsorption(key, ctx)
  }
  private horizontalAdsorption(
    key: keyof IGeometryData,
    ctx: IValueWillChange<number>,
  ) {
    const { top, bottom, centerY } = this.getAdsorptionBound(this.cloneTransformOBB)
    const topClosest = this.getClosestValInSortedArr(this.sortedAdsorptionY, top)
    const bottomClosest = this.getClosestValInSortedArr(
      this.sortedAdsorptionY,
      bottom,
    )
    const centerClosest = this.getClosestValInSortedArr(
      this.sortedAdsorptionY,
      centerY,
    )
    const topOffset = abs(topClosest - top)
    const bottomOffset = abs(bottomClosest - bottom)
    const centerOffset = abs(centerClosest - centerY)
    const minOffset = min(topOffset, bottomOffset, centerOffset)
    this.toDrawHLines.length = 0
    ctx.newValue += iife(() => {
      let offset = 0
      if (minOffset >= 10 / StageViewport.zoom.value) return offset
      const { left, right } = this.getAdsorptionBound(StageTransform.transformOBB)
      if (isNumberEqual(minOffset, topOffset)) {
        offset = topClosest - top
        const xs = new Set(this.hAdsorptionMap.get(topClosest))
        this.toDrawHLines.push({ y: topClosest, xs: [...xs, left, right] })
      }
      if (isNumberEqual(minOffset, bottomOffset)) {
        offset = bottomClosest - bottom
        const xs = new Set(this.hAdsorptionMap.get(bottomClosest))
        this.toDrawHLines.push({ y: bottomClosest, xs: [...xs, left, right] })
      }
      if (isNumberEqual(minOffset, centerOffset)) {
        offset = centerClosest - centerY
        const xs = new Set(this.hAdsorptionMap.get(centerClosest))
        this.toDrawHLines.push({ y: centerClosest, xs: [...xs, left, right] })
      }
      this.needDraw = true
      return offset
    })
  }
  private verticalAdsorption(
    key: keyof IGeometryData,
    ctx: IValueWillChange<number>,
  ) {
    const { left, right, centerX } = this.getAdsorptionBound(this.cloneTransformOBB)
    const leftClosest = this.getClosestValInSortedArr(this.sortedAdsorptionX, left)
    const rightClosest = this.getClosestValInSortedArr(this.sortedAdsorptionX, right)
    const centerClosest = this.getClosestValInSortedArr(
      this.sortedAdsorptionX,
      centerX,
    )
    const leftOffset = abs(leftClosest - left)
    const rightOffset = abs(rightClosest - right)
    const centerOffset = abs(centerClosest - centerX)
    const minOffset = min(leftOffset, rightOffset, centerOffset)
    this.toDrawVLines.length = 0
    ctx.newValue += iife(() => {
      let offset = 0
      if (minOffset >= 10 / StageViewport.zoom.value) return offset
      const { top, bottom } = this.getAdsorptionBound(StageTransform.transformOBB)
      if (isNumberEqual(minOffset, leftOffset)) {
        offset = leftClosest - left
        const ys = new Set(this.vAdsorptionMap.get(leftClosest))
        this.toDrawVLines.push({ x: leftClosest, ys: [...ys, top, bottom] })
      }
      if (isNumberEqual(minOffset, rightOffset)) {
        offset = rightClosest - right
        const ys = new Set(this.vAdsorptionMap.get(rightClosest))
        this.toDrawVLines.push({ x: rightClosest, ys: [...ys, top, bottom] })
      }
      if (isNumberEqual(minOffset, centerOffset)) {
        offset = centerClosest - centerX
        const ys = new Set(this.vAdsorptionMap.get(centerClosest))
        this.toDrawVLines.push({ x: centerClosest, ys: [...ys, top, bottom] })
      }
      this.needDraw = true
      return offset
    })
  }
  private collectAdsorption(obb: OBB) {
    const { left, right, top, bottom, centerX, centerY } =
      this.getAdsorptionBound(obb)
    this.hAdsorptionMap.getSet(top, () => []).push(left, right)
    this.hAdsorptionMap.getSet(bottom, () => []).push(left, right)
    this.hAdsorptionMap.getSet(centerY, () => []).push(left, right)
    this.vAdsorptionMap.getSet(left, () => []).push(top, bottom)
    this.vAdsorptionMap.getSet(right, () => []).push(top, bottom)
    this.vAdsorptionMap.getSet(centerX, () => []).push(top, bottom)
  }
  private getAdsorptionBound(obb: OBB) {
    const { x, y, width, height } = obb.aabb
    const [left, right] = [x, x + width]
    const [top, bottom] = [y, y + height]
    const [centerX, centerY] = [x + width / 2, y + height / 2]
    return { left, right, top, bottom, centerX, centerY }
  }
  private getClosestValInSortedArr = (sortedArr: number[], target: number) => {
    if (sortedArr.length === 1) return sortedArr[0]
    let [left, right] = [0, sortedArr.length - 1]
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (sortedArr[mid] === target) {
        return sortedArr[mid]
      } else if (sortedArr[mid] < target) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }
    if (left >= sortedArr.length) return sortedArr[right]
    if (right < 0) return sortedArr[left]
    return Math.abs(sortedArr[right] - target) <= Math.abs(sortedArr[left] - target)
      ? sortedArr[right]
      : sortedArr[left]
  }
  private autoDraw() {
    if (!this.needDraw) return this.clear()
    if (!this.adsorptionElement.parent) {
      this.adsorptionElement.setParent(Pixi.sceneStage)
    }
    this.adsorptionElement.clear()
    this.adsorptionElement.lineStyle(1 / StageViewport.zoom.value, '#FF6227')
    this.toDrawHLines.forEach(({ y, xs }) => {
      const [start, end] = [min(...xs), max(...xs)]
      this.adsorptionElement.moveTo(start, y).lineTo(end, y)
      xs.forEach((x) => this.drawXShape(x, y))
    })
    this.toDrawVLines.forEach(({ x, ys }) => {
      const [start, end] = [min(...ys), max(...ys)]
      this.adsorptionElement.moveTo(x, start).lineTo(x, end)
      ys.forEach((y) => this.drawXShape(x, y))
    })
  }
  private drawXShape(x: number, y: number) {
    const half = (sqrt(2) * 1.5) / StageViewport.zoom.value
    this.adsorptionElement.moveTo(x - half, y - half).lineTo(x + half, y + half)
    this.adsorptionElement.moveTo(x - half, y + half).lineTo(x + half, y - half)
  }
  private clear() {
    this.adsorptionElement.clear()
    this.hAdsorptionMap.clear()
    this.vAdsorptionMap.clear()
    this.sortedAdsorptionX.length = 0
    this.sortedAdsorptionY.length = 0
  }
}

export const StageWidgetAdsorption = new StageWidgetAdsorptionService()
