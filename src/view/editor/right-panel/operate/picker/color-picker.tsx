import equal from 'fast-deep-equal'
import { PipetteIcon } from 'lucide-react'
import { createContext, RefObject } from 'react'
import { Drag } from 'src/global/event/drag'
import { IRGBA } from 'src/utils/color'
import { Btn } from 'src/view/component/btn'

const Context = createContext({
  hue: 0,
  saturation: 0,
  value: 0,
  alpha: 0,
  setHue: (hue: number) => {},
  setSaturation: (saturation: number) => {},
  setValue: (value: number) => {},
  setAlpha: (alpha: number) => {},
})

export const ColorPicker: FC<{
  color: Parameters<typeof Color>[0]
  onChange: (color: IRGBA) => void
  className?: string
}> = observer(({ color, onChange, className }) => {
  const result = Color(color)

  const [hue, setHue] = useState(result.hue())
  const [saturation, setSaturation] = useState(result.saturationl())
  const [value, setValue] = useState(result.value())
  const [alpha, setAlpha] = useState(result.alpha())
  const lastState = useRef({ hue, saturation, value, alpha })

  useEffect(() => {
    if (equal(lastState.current, { hue, saturation, value: value, alpha })) return

    const { r, g, b } = Color.hsv(hue, saturation, value).rgb().object()
    onChange({ r: r | 0, g: g | 0, b: b | 0, a: alpha })

    lastState.current = { hue, saturation, value, alpha }
  }, [hue, saturation, value, alpha])

  return (
    <Context.Provider
      value={{
        hue,
        saturation,
        value,
        alpha,
        setHue,
        setSaturation,
        setValue,
        setAlpha,
      }}>
      <G className={cx(cls(), className)}>
        <SquareComp />
        <G
          horizontal='auto 1fr'
          gap={12}
          style={{ height: 36, alignItems: 'center' }}>
          <EyeDropperComp />
          <G style={{ alignContent: 'space-around' }}>
            <HueComp />
            <AlphaComp />
          </G>
        </G>
      </G>
    </Context.Provider>
  )
})

const SquareComp: FC<{}> = observer(({}) => {
  const { hue, saturation, value, setSaturation, setValue } = useContext(Context)

  const [x, setX] = useState(saturation / 100)
  const [y, setY] = useState(1 - value / 100)
  const [lastXY] = useState(() => XY.$(0, 0))
  const ref = useRef<HTMLDivElement>(null)

  const backgroundGradient = useMemo(() => {
    return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`
  }, [hue])

  const onPointerDown = (x: number, y: number) => {
    const { left, top, width, height } = ref.current!.getBoundingClientRect()
    x = max(0, min(1, (x - left) / width))
    y = max(0, min(1, (y - top) / height))
    setSaturation(x * 100)
    setValue((1 - y) * 100)
    setX(x)
    setY(y)
  }

  useEffect(() => {
    setX(saturation / 100)
    setY(1 - value / 100)
  }, [saturation, value])

  const handleMove = (e: React.MouseEvent) => {
    onPointerDown(...XY.client(e).tuple())
    Drag.onMove(({ current }) => {
      onPointerDown(current.x, current.y)
    })
      .onDestroy(({ current, moved }) => {
        if (equal(lastXY, current) && !moved) return
        lastXY.x = current.x
        lastXY.y = current.y
        YUndo.track({ type: 'state', description: t('adjust color') })
      })
      .start(e)
  }

  return (
    <G ref={ref} className={cls('square')}>
      <G
        className={cls('square-background')}
        style={{ background: backgroundGradient }}
        onMouseDown={handleMove}
      />
      <G
        className={cls('pointer')}
        onMouseDown={handleMove}
        style={{
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          backgroundColor: Color.hsv(hue, saturation, value).string(),
          transform: `translate(-50%, -50%)`,
        }}
      />
    </G>
  )
})

function useSlider(
  ref: RefObject<HTMLDivElement>,
  init: number,
  onValueChange: (value: number) => void,
) {
  const [x, setX] = useState(init)
  const lastValue = useRef(init)

  useEffect(() => setX(init), [init])

  const handleSetX = (x: number) => {
    const { left, width } = ref.current!.getBoundingClientRect()
    x = max(0, min(1, (x - left) / width))
    setX(Math.max(Math.min(x, 1), 0))
    onValueChange(x)
  }

  const handleMove = (e: React.MouseEvent) => {
    handleSetX(e.clientX)
    Drag.onMove(({ current }) => {
      handleSetX(current.x)
    })
      .onDestroy(({ current }) => {
        if (lastValue.current === current.x) return
        lastValue.current = current.x
        YUndo.track({ type: 'state', description: t('adjust color') })
      })
      .start(e)
  }

  return {
    value: x,
    handleMove,
  }
}

const HueComp: FC<{}> = observer(({}) => {
  const { hue, setHue } = useContext(Context)
  const ref = useRef<HTMLDivElement>(null)
  const { value, handleMove } = useSlider(ref, hue / 360, (x) => {
    setHue(x * 360)
  })
  return (
    <G className={cls('hue')} ref={ref} onMouseDown={handleMove}>
      <G
        className={cls('pointer')}
        style={{
          left: `${value * 100}%`,
          transform: `translate(-50%, -3px)`,
          backgroundColor: Color.hsl(hue, 100, 50).string(),
        }}
      />
    </G>
  )
})

const AlphaComp: FC<{}> = observer(({}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { alpha, setAlpha } = useContext(Context)
  const { value, handleMove } = useSlider(ref, alpha, (x) => setAlpha(x))
  return (
    <G className={cls('alpha')} ref={ref} onMouseDown={handleMove}>
      <G
        className={cls('pointer')}
        style={{
          left: `${value * 100}%`,
          transform: `translate(-50%, -3px)`,
          backgroundColor: Color.hsl(0, 0, 50, alpha).string(),
        }}
      />
    </G>
  )
})

const EyeDropperComp: FC<{}> = observer(({}) => {
  const { setHue, setSaturation, setValue: setValue, setAlpha } = useContext(Context)
  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new EyeDropper()
      const result = await eyeDropper.open()
      const color = Color(result.sRGBHex)
      const [h, s, l] = color.hsl().array()

      setHue(h)
      setSaturation(s)
      setValue(l)
      setAlpha(1)
    } catch (error) {}
  }
  return (
    <Btn
      size={30}
      icon={<Lucide icon={PipetteIcon} />}
      style={{ border: '1px solid var(--gray-border)' }}
      onClick={handleEyeDropper}
    />
  )
})

const cls = classes(css`
  width: 216px;
  row-gap: 8px;
  &-pointer {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    position: absolute;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 3;
    cursor: pointer;
  }
  &-square {
    width: 216px;
    height: 172px;
    z-index: 0;
    &-background {
      border-radius: 3px;
    }
  }
  &-hue {
    height: 8px;
    border-radius: 99px;
    background: linear-gradient(
      90deg,
      #ff0000,
      #ffff00,
      #00ff00,
      #00ffff,
      #0000ff,
      #ff00ff,
      #ff0000
    );
  }
  &-alpha {
    height: 8px;
    border-radius: 99px;
    background: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5));
  }
`)
