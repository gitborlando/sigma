const polygonCount = 10000
const polygonEdgeCount = 4

const polygons = Array.from({ length: polygonCount }, (_, i) => {
  const points = Array.from({ length: polygonEdgeCount }, () => ({
    x: Math.random() * 10000,
    y: Math.random() * 10000,
  }))
  return points
})

const rects = Array.from({ length: polygonCount }, (_, i) => {
  const xy = XY.$(Math.random() * 10000, Math.random() * 10000)
  const width = Math.random() * 100
  const height = Math.random() * 100
  return { ...xy, width, height }
})

const circles = Array.from({ length: polygonCount }, (_, i) => {
  const xy = XY.$(Math.random() * 10000, Math.random() * 10000)
  return { ...xy, r: Math.random() * 100 }
})

function inRect(
  rect: { x: number; y: number; width: number; height: number },
  xy: { x: number; y: number },
) {
  return !(
    xy.x < rect.x ||
    xy.x > rect.x + rect.width ||
    xy.y < rect.y ||
    xy.y > rect.y + rect.height
  )
}

function inCircle(
  circle: { x: number; y: number; r: number },
  xy: { x: number; y: number },
) {
  if (Math.abs(xy.x - circle.x) > circle.r) return false
  if (Math.abs(xy.y - circle.y) > circle.r) return false
  return (xy.x - circle.x) ** 2 + (xy.y - circle.y) ** 2 < circle.r ** 2
}

let allTime = 0
let testCount = 100

for (let j = 0; j < testCount; j++) {
  let start = performance.now()
  const xy = XY.$(Math.random() * 10000, Math.random() * 10000)
  for (let i = 0; i < polygonCount; i++) {
    // inPolygon(polygons[i], xy)
    // aver: 0.5ms
    // inRect(rects[i], xy)
    // aver: 1.8ms
    inCircle(circles[i], xy)
    // aver: 2.4ms
  }
  const during = performance.now() - start
  if (j >= 4) allTime += during
}

console.log(`allTime: ${allTime}ms, aver: ${allTime / (testCount - 4)}ms`)
