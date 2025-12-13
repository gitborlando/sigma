import { objKeys } from '@gitborlando/utils'
import { HandleNode } from 'src/editor/handle/node'
import { divide, floor, max, min } from 'src/editor/math/base'
import { createRegularPolygon, createStarPolygon } from 'src/editor/math/point'
import { SchemaHelper, SchemaUtilTraverseData } from 'src/editor/schema/helper'
import { MULTI_VALUE } from 'src/global/constant'
import { cleanObject, iife } from 'src/shared/utils/normal'
import { getSelectIdList } from '../y-state/y-clients'

function createAllGeometry() {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    radius: 0,
    sides: 3,
    pointCount: 5,
    startAngle: 0,
    endAngle: 360,
    innerRate: 0,
  }
}

function createActiveKeys(
  set: Set<keyof AllGeometry>,
  keys: (keyof AllGeometry)[] = [],
) {
  set.clear()
  keys.forEach((key) => set.add(key))
  return set
}

export type AllGeometry = ReturnType<typeof createAllGeometry>

class OperateGeometryService {
  activeGeometry = createAllGeometry()
  activeKeys = createActiveKeys(new Set())
  operateKeys = createActiveKeys(new Set())
  deltaKeys = createActiveKeys(new Set())

  setupActiveKeys(selectedNodes: V1.Node[]) {
    createActiveKeys(this.activeKeys, ['x', 'y', 'width', 'height', 'rotation'])

    selectedNodes.forEach((node) => {
      if (node.type === 'frame') this.activeKeys.add('radius')
      if (node.type === 'rect') this.activeKeys.add('radius')
      if (node.type === 'polygon') this.activeKeys.add('sides')
      if (node.type === 'star') {
        this.activeKeys.add('innerRate')
        this.activeKeys.add('pointCount')
      }
      if (node.type === 'ellipse') {
        this.activeKeys.add('startAngle')
        this.activeKeys.add('endAngle')
        this.activeKeys.add('innerRate')
      }
    })
  }

  setupActiveGeometry(selectedNodes: V1.Node[]) {
    cleanObject(this.activeGeometry)
    selectedNodes.forEach((node, i) => {
      this.activeKeys.forEach((key) => {
        if (i === 0) this.activeGeometry[key] = T<any>(node)[key]
        else if (this.activeGeometry[key] !== T<any>(node)[key])
          T<any>(this.activeGeometry)[key] = MULTI_VALUE
      })
    })
  }

  setActiveGeometries(
    geometries: Partial<Record<keyof AllGeometry, number>>,
    delta: boolean = true,
  ) {
    for (const key of objKeys(geometries)) {
      if (delta) this.deltaKeys.add(key)
      this.operateKeys.add(key)
      this.activeGeometry[key] = geometries[key] as number
    }
    const traverse = SchemaHelper.createTraverse({
      callback: this.applyChangeToNode,
    })
    traverse(getSelectIdList())
    YState.next()

    this.operateKeys.clear()
    this.deltaKeys.clear()
  }

  setActiveGeometry(key: keyof AllGeometry, value: number, delta: boolean = true) {
    if (delta) this.deltaKeys.add(key)
    this.operateKeys.add(key)
    this.activeGeometry[key] = value

    const traverse = SchemaHelper.createTraverse({
      callback: this.applyChangeToNode,
    })
    traverse(getSelectIdList())
    YState.next()

    this.operateKeys.clear()
    this.deltaKeys.clear()
  }

  private delta(key: keyof AllGeometry, node: V1.Node) {
    const rawDelta = iife(() => {
      if (this.deltaKeys.has(key)) return this.activeGeometry[key]
      return this.activeGeometry[key] - T<any>(node)[key]
    })
    // if (['width', 'height'].includes(key)) {
    //   if (T<any>(node)[key] + rawDelta < 1) return T<any>(node)[key] - 1
    //   return rawDelta
    // }
    return rawDelta
  }

  private deltaRate(key: keyof AllGeometry, node: any) {
    return divide(this.delta(key, node), node[key])
  }

  private applyChangeToNode(traverseData: SchemaUtilTraverseData) {
    const { node, depth } = traverseData

    if (depth === 0) this.patchChangeToVectorPoints(node.id)

    this.operateKeys.forEach((key) => {
      if (key === 'width') {
        if (depth !== 0) return
        return YState.set(`${node.id}.width`, node.width + this.delta(key, node))
      }
      if (key === 'height') {
        if (depth !== 0 || node.type === 'line') return
        return YState.set(`${node.id}.height`, node.height + this.delta(key, node))
      }
      if (key === 'radius') {
        if (depth !== 0) return
        return YState.set(
          `${node.id}.radius`,
          max(0, T<any>(node).radius + this.delta(key, node)),
        )
      }
      if (key === 'rotation') {
        if (this.operateKeys.size === 1) {
          return this.applyRotationToNode(traverseData, node, depth)
        }
        return YState.set(
          `${node.id}.rotation`,
          Angle.normal(node.rotation + this.delta('rotation', node)),
        )
      }
      if (key === 'sides') {
        let { width, height, sides } = node as V1.Polygon
        sides = max(3, sides + floor(this.delta(key, node)))
        YState.set(`${node.id}.sides`, sides)
        YState.set(`${node.id}.points`, createRegularPolygon(width, height, sides))
        return
      }
      if (key === 'pointCount' || key === 'innerRate') {
        let { width, height, pointCount, innerRate } = node as V1.Star
        pointCount = max(3, floor(pointCount))
        innerRate = min(1, max(0, innerRate))
        YState.set(`${node.id}.pointCount`, pointCount)
        YState.set(`${node.id}.innerRate`, innerRate)
        YState.set(
          `${node.id}.points`,
          createStarPolygon(width, height, pointCount, innerRate),
        )
      }
      YState.set(`${node.id}.${key}`, T<any>(node)[key] + this.delta(key, node))
    })
  }

  private applyRotationToNode(
    traverseData: SchemaUtilTraverseData,
    node: V1.Node,
    depth: number,
  ) {
    const { getNodeCenterXY } = HandleNode
    const centerXY = getNodeCenterXY(node)
    const newXY = XY.of(node).rotate(centerXY, this.delta('rotation', node)).xy

    YState.set(
      `${node.id}.rotation`,
      Angle.normal(node.rotation + this.delta('rotation', node)),
    )

    if (depth === 0) {
      YState.set(`${node.id}.x`, newXY.x)
      YState.set(`${node.id}.y`, newXY.y)
    } else {
      let upLevelRef = traverseData.upLevelRef!
      while (upLevelRef.upLevelRef) upLevelRef = upLevelRef.upLevelRef
      const ancestorCenter = getNodeCenterXY(upLevelRef.node)
      const newCenter = XY.of(centerXY).rotate(
        ancestorCenter,
        this.delta('rotation', node),
      )
      const centerShift = newCenter.minus(centerXY).xy
      YState.set(`${node.id}.x`, newXY.x + centerShift.x)
      YState.set(`${node.id}.y`, newXY.y + centerShift.y)
    }
  }

  private patchChangeToVectorPoints(id: string) {
    const node = YState.find<V1.Vector>(id)
    if (!node.points) return

    node.points.forEach((point, i) => {
      if (this.operateKeys.has('width')) {
        const deltaRate = this.deltaRate('width', node)
        const newX = point.x * (1 + deltaRate)
        YState.set(`${node.id}.points.${i}.x`, newX)

        if (point.handleL) {
          const handleLX = point.handleL.x * (1 + deltaRate)
          YState.set(`${node.id}.points.${i}.handleL.x`, handleLX)
        }
        if (point.handleR) {
          const handleRX = point.handleR.x * (1 + deltaRate)
          YState.set(`${node.id}.points.${i}.handleR.x`, handleRX)
        }
      }

      if (this.operateKeys.has('height')) {
        const deltaRate = this.deltaRate('height', node)
        const newY = point.y * (1 + deltaRate)
        YState.set(`${node.id}.points.${i}.y`, newY)

        if (point.handleL) {
          const handleLY = point.handleL.y * (1 + deltaRate)
          YState.set(`${node.id}.points.${i}.handleL.y`, handleLY)
        }
        if (point.handleR) {
          const handleRY = point.handleR.y * (1 + deltaRate)
          YState.set(`${node.id}.points.${i}.handleR.y`, handleRY)
        }
      }
    })
  }
}

export const OperateGeometry = autoBind(new OperateGeometryService())
