import { HandleNode } from 'src/editor/handle/node'
import { StageViewport } from 'src/editor/stage/viewport'

const getNearestIntMultiple = (number: number, rate: number) => {
  const n = Math.floor(number / rate)
  const left = rate * n
  const right = rate * (n + 1)
  return number - left <= right - number ? left : right
}

export const RulerComp: FC<{}> = observer(({}) => {
  return (
    <G className={cls()}>
      <Ruler type='horizontal' />
      <Ruler type='vertical' />
      {/* <G center className={cls('corner')}></G> */}
    </G>
  )
})

export const Ruler: FC<{
  type: 'horizontal' | 'vertical'
}> = observer(({ type }) => {
  const isVertical = type === 'vertical'
  const { bound, zoom, offset: offsetXY } = StageViewport
  const datumXY = HandleNode.datumXY

  const getTicks = () => {
    const ticks: { offset: number; value: number }[] = []
    const length = (type === 'horizontal' ? bound.width : bound.height) / zoom
    const offset =
      (type === 'horizontal' ? offsetXY.x + datumXY.x : offsetXY.y + datumXY.y) /
      zoom
    const step = StageViewport.getStepByZoom(zoom)
    const start = getNearestIntMultiple(-offset, step)
    const end = getNearestIntMultiple(length - offset, step)
    for (let i = start; i <= end; i += step) {
      const y = (i + offset) * zoom
      ticks.push({ offset: y, value: i })
    }
    return ticks
  }

  return (
    <G
      horizontal
      className={cx(cls('ruler'), isVertical && cls('ruler-vertical'))}
      style={{ ...(isVertical && { width: bound.height }) }}>
      {getTicks().map(({ offset, value }) => (
        <Tick key={offset} type={type} offset={offset} value={value} />
      ))}
    </G>
  )
})

export const Tick: FC<{
  type: 'horizontal' | 'vertical'
  offset: number
  value: number
}> = observer(({ type, offset, value }) => {
  const isVertical = type === 'vertical'
  return (
    <G
      vertical
      center
      className={cls('ruler-tick')}
      style={{ left: offset, top: 0 }}>
      <G center className={cls('ruler-tick-border')} x-if={type === 'horizontal'} />
      <G
        center
        className={cls('ruler-tick-text')}
        style={{ ...(isVertical && { transform: 'scale(-1)' }) }}>
        {value}
      </G>
      <G center className={cls('ruler-tick-border')} x-if={type === 'vertical'} />
    </G>
  )
})

const cls = classes(css`
  position: absolute;
  overflow: hidden;
  pointer-events: none;
  &-ruler {
    height: 20px;
    &-vertical {
      position: absolute;
      transform: rotate(90deg);
      transform-origin: left bottom;
    }
    &-tick {
      ${styles.fitContent}
      position: absolute;
      transform: translateX(-50%);
      justify-items: center;
      &-border {
        width: 1px;
        height: 4px;
        border-left: 1px solid #9f9f9f;
      }
      &-text {
        font-size: 10px;
        color: #9f9f9f;
      }
    }
  }
  &-corner {
    width: 20px;
    height: 20px;
    background-color: #f7f8fa;
    position: absolute;
    top: 0;
    left: 0;
  }
`)
