import { optionalSet } from '@gitborlando/utils'
import { EditorSetting } from 'src/editor/editor/setting'

export const FPSComp: FC<{}> = observer(({}) => {
  const { showFPS } = EditorSetting.setting
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let prevTime = performance.now()
    let frames = 0

    let raf: number

    const loop = () => {
      raf = requestAnimationFrame(loop)
      frames++

      const time = performance.now()
      if (time > prevTime + 1000) {
        const text = `${Math.round(Math.max((frames * 1000) / (time - prevTime), 0))}fps`
        optionalSet(ref.current, 'innerText', text)
        prevTime = time
        frames = 0
      }
    }

    loop()

    return () => cancelAnimationFrame(raf)
  }, [])

  return showFPS && <G ref={ref} center className={cls()}></G>
})

const cls = classes(css`
  ${styles.fitContent}
  position: absolute;
  top: 20px;
  right: 10px;
  font-size: 20px;
  pointer-events: none;
`)
