export function createUrlFromSvgString(svgString: string) {
  return URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }))
}

export const recordTime = (
  name: string,
  func: (
    logTime: (label: string) => void,
    range: (times: number, func: Function) => void,
  ) => void,
  times = 1,
) => {
  const start = performance.now()
  let lastTime = start
  let minTime = Infinity
  let maxTime = 0
  const logTime = (label: string) => {
    const now = performance.now()
    const time = now - lastTime
    minTime = Math.min(minTime, time)
    maxTime = Math.max(maxTime, time)
    console.log(`${label}: ${time}ms`)
    lastTime = now
  }
  const range = (times: number, func: Function) => {
    for (let i = 0; i < times; i++) {
      func(logTime)
    }
  }
  for (let i = 0; i < times; i++) {
    func(logTime, range)
  }
  const total = performance.now() - start
  const average = total / times
  console.log(`${name} total: ${performance.now() - start}ms`)
  console.log(`${name} average: ${average}ms`)
  console.log(`${name} min: ${minTime}ms`)
  console.log(`${name} max: ${maxTime}ms`)
  console.log('--------------------------------\n\n\n')
}
