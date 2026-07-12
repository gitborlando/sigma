const iconSize = 14
const fallbackPath = 'M5 10H15'

export const LayerNodeTreePathIcon: FC<{ node: S.Path }> = ({ node }) => {
  const { d, viewBox } = getPathIconInfo(node.points)

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox={viewBox}
      fill='none'
      aria-hidden='true'
      className={cls()}>
      <path
        d={d}
        stroke='currentColor'
        strokeWidth='1'
        strokeLinecap='round'
        strokeLinejoin='round'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  )
}

const getPathIconInfo = (points: S.Point[]) => {
  if (points.length < 2) {
    return { d: fallbackPath, viewBox: `0 0 ${iconSize} ${iconSize}` }
  }

  const d = toSvgPathD(points)
  if (!d) return { d: fallbackPath, viewBox: `0 0 ${iconSize} ${iconSize}` }

  return { d, viewBox: getViewBox(points) }
}

const toSvgPathD = (points: S.Point[]) => {
  const path: string[] = []

  points.forEach((cur, i) => {
    const next = points[i + 1]
    if (i === 0 || cur.isStart) path.push(`M ${cur.x} ${cur.y}`)
    if (i === points.length - 1) {
      if (cur.isEnd) path.push('Z')
      return
    }
    if (!next || next.isStart) return

    if (cur.out && next.in) {
      path.push(
        `C ${cur.out.x} ${cur.out.y} ${next.in.x} ${next.in.y} ${next.x} ${next.y}`,
      )
      return
    }
    if (cur.out) {
      path.push(`Q ${cur.out.x} ${cur.out.y} ${next.x} ${next.y}`)
      return
    }
    if (next.in) {
      path.push(`Q ${next.in.x} ${next.in.y} ${next.x} ${next.y}`)
      return
    }
    path.push(`L ${next.x} ${next.y}`)
  })

  return path.join(' ')
}

const getViewBox = (points: S.Point[]) => {
  const xys = points.flatMap((point) => [
    point,
    ...(point.in ? [point.in] : []),
    ...(point.out ? [point.out] : []),
  ])

  const xs = xys.map((xy) => xy.x)
  const ys = xys.map((xy) => xy.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = Math.max(maxX - minX, 1)
  const height = Math.max(maxY - minY, 1)
  const padding = 10

  return `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`
}

const cls = classes(css`
  display: block;
  flex: 0 0 ${iconSize}px;
  width: ${iconSize}px;
  height: ${iconSize}px;
`)
