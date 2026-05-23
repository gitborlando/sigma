import { loopFor } from '@gitborlando/utils'
import { IXY } from './normal'

export class IrregularUtils {
  static shiftPointX(point: IPoint, x: number) {
    point.x += x
    if (point.handleL) point.handleL.x += x
    if (point.handleR) point.handleR.x += x
  }
  static shiftPointY(point: IPoint, y: number) {
    point.y += y
    if (point.handleL) point.handleL.y += y
    if (point.handleR) point.handleR.y += y
  }
  static shiftPointXY(point: IPoint, xy: IXY) {
    this.shiftPointX(point, xy.x)
    this.shiftPointY(point, xy.y)
  }

  static multiPointX(point: IPoint, x: number) {
    point.x *= x
    if (point.handleL) point.handleL.x *= x
    if (point.handleR) point.handleR.x *= x
  }
  static multiPointY(point: IPoint, y: number) {
    point.y *= y
    if (point.handleL) point.handleL.y *= y
    if (point.handleR) point.handleR.y *= y
  }
  static multiplyPointXY(point: IPoint, xy: IXY) {
    this.multiPointX(point, xy.x)
    this.multiPointY(point, xy.y)
  }

  static getNodeSvgPath(node: IIrregular) {
    let path = ''
    loopFor(node.points, (cur, next, prev, i) => {
      if (i === node.points.length - 1 && cur.endPath) return void (path += 'Z ')
      if (cur.startPath) path += `M${cur.x},${cur.y} `
      if (next.startPath) return
      if (cur.handleR && next.handleL) {
        const [cp2, cp1] = [next.handleL, cur.handleR]
        path += `C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${next.x},${next.y} `
      } else if (cur.handleR) {
        path += `Q${cur.handleR.x},${cur.handleR.y} ${next.x},${next.y} `
      } else if (next.handleL) {
        path += `Q${next.handleL.x},${next.handleL.y} ${cur.x},${cur.y} `
      } else {
        path += `L${next.x},${next.y} `
      }
    })
    return path
  }
}
