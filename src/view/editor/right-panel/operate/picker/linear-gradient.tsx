import { OperateFill } from 'src/editor/operate/fill'
import { Drag } from 'src/global/event/drag'
import { makeLinearGradientCss, rgbaFromObject } from 'src/utils/color'
import { ColorPicker } from 'src/view/editor/right-panel/operate/picker/color-picker'

export const PickerLinearGradientComp: FC<{
  fill: V1.FillLinearGradient
  index: number
}> = memo(({ fill, index }) => {
  const [stopIndex, setStopIndex] = useState(0)
  useEffect(() => setStopIndex(0), [index])

  const setStopColor = (color: string) => {
    OperateFill.setFill<V1.FillLinearGradient>(index, (draft) => {
      draft.stops[stopIndex].color = color
    })
  }

  return (
    <G vertical='auto 1fr' className={cls()}>
      <StopsBar
        fill={fill}
        index={index}
        stopIndex={stopIndex}
        setStopIndex={setStopIndex}
      />
      <ColorPicker
        color={fill.stops[stopIndex].color}
        onChange={(color) => setStopColor(rgbaFromObject(color))}
      />
    </G>
  )
})

const StopsBar: FC<{
  fill: V1.FillLinearGradient
  index: number
  stopIndex: number
  setStopIndex: (index: number) => void
}> = ({ fill, index, stopIndex, setStopIndex }) => {
  const stopBarRef = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.MouseEvent, stopIndex: number) => {
    setStopIndex(stopIndex)
    Drag.onMove(({ delta }) => {
      const deltaOffset = delta.x / stopBarRef.current!.clientWidth
      OperateFill.setFill<V1.FillLinearGradient>(index, (draft) => {
        const oldOffset = draft.stops[stopIndex].offset
        draft.stops[stopIndex].offset = min(max(oldOffset + deltaOffset, 0), 1)
      })
    })
      .onDestroy(({ moved }) => {
        if (!moved) return
        YUndo.track({ type: 'state', description: t('move gradient point') })
      })
      .start(e)
  }

  return (
    <G horizontal center className={cls('stopBar')}>
      <G
        className={cls('stopBar-background')}
        style={{ background: makeLinearGradientCss(fill) }}>
        <G horizontal center className={cls('stopBar-track')} ref={stopBarRef}>
          {fill.stops.map((stop, index) => (
            <G
              key={index}
              className={cls('stopBar-stop')}
              style={{
                backgroundColor: `${stop.color}`,
                left: `${stop.offset * 100}%`,
                ...(stopIndex === index && { outline: '2px solid var(--color)' }),
              }}
              onMouseDown={(e) => handleMove(e, index)}></G>
          ))}
        </G>
      </G>
    </G>
  )
}

const cls = classes(css`
  row-gap: 8px;
  &-stopBar {
    width: 216px;
    height: 20px;
    border-radius: 99px;
    position: relative;
    &-background {
      height: 8px;
      border-radius: 99px;
    }
    &-track {
      height: 8px;
      width: calc(100% - 14px);
    }
    &-stop {
      width: 14px;
      height: 14px;
      border-radius: 99px;
      position: absolute;
      border: 2px solid white;
      cursor: pointer;
      box-shadow:
        0 0 3px 0px rgba(0, 0, 0, 0.7),
        inset 0 0 5px -2px rgba(0, 0, 0, 0.7);
    }
  }
`)
