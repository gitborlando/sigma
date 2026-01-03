import { createCache, objKeys } from '@gitborlando/utils'
import { Matrix } from 'src/editor/math'
import { divide, floor, max, min } from 'src/editor/math/base'
import { createRegularPolygon, createStarPolygon } from 'src/editor/math/point'
import { getSelectedNodes } from 'src/editor/y-state/y-state'
import { MULTI_VALUE } from 'src/global/constant'
import { cleanObject, iife } from 'src/shared/utils/normal'

function createDesignGeoInfos() {
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
  set: Set<keyof DesignGeoInfo>,
  keys: (keyof DesignGeoInfo)[] = [],
) {
  set.clear()
  keys.forEach((key) => set.add(key))
  return set
}

const obbKeySet = new Set(['x', 'y', 'width', 'height', 'rotation'])

export type DesignGeoInfo = ReturnType<typeof createDesignGeoInfos>
export type DesignGeoInfoWithMatrix = DesignGeoInfo & { matrix: IMatrix }

class DesignGeometryService {
  currentGeometries = createDesignGeoInfos()
  currentKeys = createActiveKeys(new Set())
  changingKeys = createActiveKeys(new Set())
  isDelta = true
  matrix?: Matrix

  setupGeometries(selectedNodes: V1.Node[]) {
    cleanObject(this.currentGeometries)
    createActiveKeys(this.currentKeys, ['x', 'y', 'width', 'height', 'rotation'])

    selectedNodes.forEach((node) => {
      if (node.type === 'frame') this.currentKeys.add('radius')
      if (node.type === 'rect') this.currentKeys.add('radius')
      if (node.type === 'polygon') this.currentKeys.add('sides')
      if (node.type === 'star') {
        this.currentKeys.add('innerRate')
        this.currentKeys.add('pointCount')
      }
      if (node.type === 'ellipse') {
        this.currentKeys.add('startAngle')
        this.currentKeys.add('endAngle')
        this.currentKeys.add('innerRate')
      }
    })

    selectedNodes.forEach((node, i) => {
      this.currentKeys.forEach((key) => {
        if (i === 0) this.currentGeometries[key] = this.getGeometryValue(node, key)
        else if (this.currentGeometries[key] !== this.getGeometryValue(node, key))
          T<any>(this.currentGeometries)[key] = MULTI_VALUE
      })
    })
  }

  getGeometryValue(node: V1.Node, key: keyof DesignGeoInfo) {
    if (obbKeySet.has(key)) {
      const mrect = getNodeMrect(node)
      return mrect[key as 'x' | 'y' | 'width' | 'height' | 'rotation']
    }
    return T<any>(node)[key]
  }

  private nodeGeoInfoCache = createCache<ID, Partial<DesignGeoInfoWithMatrix>>()

  onStartSetGeometries() {
    getSelectedNodes().forEach((node) => {
      const geometries = <Partial<DesignGeoInfoWithMatrix>>{}
      this.currentKeys.forEach((key) => {
        geometries[key] = this.getGeometryValue(node, key)
      })
      geometries.matrix = node.matrix
      this.nodeGeoInfoCache.set(node.id, geometries)
    })
  }

  setGeometries(
    geometries: Partial<Record<keyof DesignGeoInfo, number>>,
    options: {
      delta?: boolean
      matrix?: IMatrix
    } = {},
  ) {
    const { matrix, delta = true } = options

    this.isDelta = delta
    if (matrix) this.matrix = Matrix.of(matrix)

    for (const key of objKeys(geometries)) {
      this.changingKeys.add(key)
      this.currentGeometries[key] = geometries[key] as number
    }

    getSelectedNodes().forEach(this.applyChangeToNode)
    YState.next()

    this.changingKeys.clear()
    this.isDelta = true
    this.matrix = undefined
  }

  onEndSetGeometries() {
    this.nodeGeoInfoCache.clear()
  }

  private delta(key: keyof DesignGeoInfo, node: V1.Node) {
    const rawDelta = iife(() => {
      if (this.isDelta) return this.currentGeometries[key]
      return this.currentGeometries[key] - T<any>(node)[key]
    })
    // if (['width', 'height'].includes(key)) {
    //   if (T<any>(node)[key] + rawDelta < 1) return T<any>(node)[key] - 1
    //   return rawDelta
    // }
    return rawDelta
  }

  private deltaRate(key: keyof DesignGeoInfo, node: any) {
    return divide(this.delta(key, node), node[key])
  }

  private applyChangeToNode(node: V1.Node) {
    this.applyMatrixToNode(node)

    this.changingKeys.forEach((key) => {
      if (obbKeySet.has(key)) {
        if (key === 'height' && node.type === 'line') return
        this.applyChangeToMrect(key as any, node)
      }
      if (key === 'radius') {
        const radius = max(0, T<any>(node).radius + this.delta(key, node))
        YState.set(`${node.id}.radius`, radius)
      }
      if (key === 'sides') {
        let { width, height, sides } = node as V1.Polygon
        sides = max(3, sides + floor(this.delta(key, node)))
        YState.set(`${node.id}.sides`, sides)
        YState.set(`${node.id}.points`, createRegularPolygon(width, height, sides))
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
    })
  }

  private applyChangeToMrect(
    key: 'x' | 'y' | 'width' | 'height' | 'rotation',
    node: V1.Node,
  ) {
    const mrect = getNodeMrect(node)
    if (this.isDelta) {
      mrect[key] = mrect[key] + this.currentGeometries[key]
    } else {
      mrect[key] = this.currentGeometries[key]
    }
    if (key === 'x' || key === 'y' || key === 'rotation') {
      YState.set(`${node.id}.matrix`, mrect.matrix)
    } else {
      YState.set(`${node.id}.${key}`, mrect[key])
    }
  }

  private patchChangeToVectorPoints(id: string) {
    const node = YState.find<V1.Vector>(id)
    if (!node.points) return

    node.points.forEach((point, i) => {
      if (this.changingKeys.has('width')) {
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

      if (this.changingKeys.has('height')) {
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

  private applyMatrixToNode(node: V1.Node) {
    const startMatrix = this.nodeGeoInfoCache.get(node.id)?.matrix
    if (!this.matrix || !startMatrix) return

    const parentMatrix = this.getParentAccumulatedMatrix(node)
    const m2 = Matrix.of({
      a: parentMatrix.a,
      b: parentMatrix.b,
      c: parentMatrix.c,
      d: parentMatrix.d,
      tx: 0,
      ty: 0,
    })
    let shift = XY.$(this.matrix.tx, this.matrix.ty)
    shift = m2.invertXY(shift)
    const m3 = Matrix.of(this.matrix).divide(m2)
    console.log('m3: ', m3.plain())
    const selfMatrix = Matrix.of(startMatrix).append(m3)
    getNodeMrect(node).matrix = selfMatrix.plain()
    YState.set(`${node.id}.matrix`, selfMatrix.plain())
  }

  private getParentAccumulatedMatrix(node: V1.Node) {
    const matrix = Matrix.identity()
    const parents: V1.Node[] = []
    let parent = node
    while (parent?.parentId) {
      parent = YState.find<V1.Node>(parent.parentId)
      parents.push(parent)
    }
    parents.reverse().forEach((parent) => {
      if (parent?.matrix) matrix.append(parent.matrix)
    })
    return matrix
  }

  private getParentAccumulatedMatrix2(node: V1.Node) {
    const matrix = Matrix.identity()
    let parent = node
    while (parent?.parentId) {
      parent = YState.find<V1.Node>(parent.parentId)
      if (parent?.matrix) matrix.prepend(parent.matrix)
    }
    return matrix
  }
}

export const DesignGeometry = autoBind(new DesignGeometryService())
