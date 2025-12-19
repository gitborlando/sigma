import { listen } from '@gitborlando/utils/browser'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Drag } from 'src/global/event/drag'
import { stopPropagation } from 'src/shared/utils/event'
import { IXY } from 'src/shared/utils/normal'
import { CommonBalanceItem } from 'src/view/component/balance-item'
import { Btn } from 'src/view/component/btn'

type DragPanelProps = {
  title: string
  children: ReactNode
  xy?: IXY
  headerSlot?: ReactNode
  width?: number
  height?: number
  center?: boolean
  className?: string
  closeFunc: () => void
  clickAwayClose?: () => boolean
  onMove?(newXY: IXY): void
}

let panelCount = 0
let maxZIndex = 0

export const DragPanel: FC<DragPanelProps> = ({
  title,
  closeFunc,
  clickAwayClose,
  children,
  xy,
  headerSlot,
  width,
  height,
  center,
  className,
  onMove,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(xy || XY._(480, 240))
  const [zIndex, setZIndex] = useState(0)

  useLayoutEffect(() => {
    if (!xy) return
    const bound = ref.current!.getBoundingClientRect()
    setPosition(XY.of(xy.x, min(xy.y, innerHeight - bound.height - 12)))
  }, [xy])

  useLayoutEffect(() => {
    if (!center) return
    const bound = ref.current!.getBoundingClientRect()
    setPosition(
      XY.of(innerWidth / 2 - bound.width / 2, innerHeight / 2 - bound.height / 2),
    )
  }, [center])

  useEffect(() => {
    panelCount++
    maxZIndex++
    return () => void panelCount--
  }, [])

  useEffect(() => {
    return listen('mousedown', () => {
      if (clickAwayClose?.()) closeFunc()
    })
  }, [])

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const startXY = position
    Drag.onSlide(({ current, shift }) => {
      if (current.x > innerWidth || current.y > innerHeight) return
      setPosition(XY.from(startXY).plus(shift))
      onMove?.(position)
    }, e)
  }

  return createPortal(
    <G
      vertical='auto 1fr'
      className={cx(cls(), className)}
      ref={ref}
      style={{
        left: position.x,
        top: position.y,
        zIndex: zIndex,
        ...(width && { width }),
        ...(height && { height }),
      }}
      onMouseDown={stopPropagation()}
      onMouseDownCapture={() => panelCount > 1 && setZIndex(maxZIndex++)}>
      <CommonBalanceItem
        isHeader
        label={title}
        className={cls('header')}
        onMouseDown={handleHeaderMouseDown}>
        <G className={cls('header-slot')}>{headerSlot}</G>
        <Btn
          size={24}
          icon={<Lucide icon={X} />}
          onMouseDown={stopPropagation()}
          onClick={closeFunc}
        />
      </CommonBalanceItem>
      <G className={cls('content')}>{children}</G>
    </G>,
    document.querySelector('#drag-panel-portal')!,
  )
}

const cls = classes(css`
  width: 240px;
  height: fit-content;
  background-color: white;
  position: fixed;
  overflow: hidden;
  ${styles.shadow}
  ${styles.borderRadius}
  &-header {
    gap: 8px;
    height: 36px;
    padding-inline: 12px 6px;
    ${styles.textHead}
    ${styles.borderBottom}
    &-title {
      padding-left: 4px;
      align-items: center;
    }
    &-slot {
      justify-content: end;
    }
  }
  &-content {
    height: 100%;
  }
`)
