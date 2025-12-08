import { abs, pow2, pow3 } from '../base'
import { xy_distance, xy_minus, xy_multiply, xy_plus_all } from '../xy'

/* 贝塞尔参数方程 */
export function bezierParametricEquation(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  a1x: number, //这几个都是控制点
  a1y: number,
  a2x: number,
  a2y: number,
  t: number, //参数t
) {
  const newXY = xy_plus_all(
    xy_multiply(XY.$(p1x, p1y), pow3(1 - t)),
    xy_multiply(XY.$(a1x, a1y), 3, t, pow2(1 - t)),
    xy_multiply(XY.$(a2x, a2y), 3, pow2(t), 1 - t),
    xy_multiply(XY.$(p2x, p2y), pow3(t)),
  )
  return [newXY.x, newXY.y]
}

/* 求贝塞尔曲线的中点, 即到两个端点的距离相同 */
export function bezierMidpoint(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  a1x: number,
  a1y: number,
  a2x: number,
  a2y: number,
) {
  let arr: {
    t: number
    x: number
    y: number
    subLength: number
    shift: number
  }[] = []
  let lastX = XY.$(p1x, p1y)
  let iteration = 30 //粒度, 越大拟合越精细
  let length = 0
  for (let i = 0; i <= iteration; i++) {
    let t = i / iteration
    let [x, y] = bezierParametricEquation(p1x, p1x, p2x, p2y, a1x, a1y, a2x, a2y, t)
    let subLength = xy_distance(XY.$(x, y), lastX)

    arr.push({ t, x, y, subLength, shift: 0 })
    length += subLength
    lastX = XY.$(x, y)
  }
  arr = arr.map((i) => ({ ...i, shift: abs(length / 2 - i.subLength) }))
  arr.sort((a, b) => a.shift - b.shift)

  return { ...arr[0], length }
}

/**
 * 从某个参数t开始分割贝塞尔曲线
 * 返回被分割后的两个贝塞尔曲线的四个控制点坐标
 * 即 [a1,a2,b1,b2]
 */
export function bezierDivide(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  a1x: number,
  a1y: number,
  a2x: number,
  a2y: number,
  t: number,
) {
  const A = XY.$(p1x, p1y)
  const B = XY.$(p2x, p2y)
  const C = XY.$(a1x, a1y)
  const D = XY.$(a2x, a2y)
  const AC = xy_multiply(xy_minus(C, A), t)
  const BD = xy_multiply(xy_minus(D, B), t)
  const CD = xy_multiply(xy_minus(D, C), t)
  const CD_AC = xy_multiply(xy_minus(CD, AC), t)
  const CD_BD = xy_multiply(xy_minus(CD, BD), t)
  return [AC, CD_AC, CD_BD, BD]
}
