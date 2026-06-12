import { listen, stopPropagation } from '@gitborlando/utils/browser'
import { createZodStorage, z } from '@sigma/utils'
import { EllipsisVertical, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Drag } from 'src/global/event/drag'
import {
  CommonBalanceItem,
  OptionBalanceItem,
} from 'src/view/component/balance-item'
import { Btn } from 'src/view/component/btn'
import { Menu } from 'src/view/component/menu'

type DragPanelProps = {
  id?: string
  show?: boolean
  title: string
  children: ReactNode
  xy?: IXY
  headerSlot?: ReactNode
  menuSlot?: ReactNode
  width?: number
  height?: number
  center?: boolean
  className?: string
  clickAwayClose?: boolean
  showFunc: (show: boolean) => void
  onMove?(newXY: IXY): void
}

let panelCount = 0
let maxZIndex = 0

const dragPanelInfoSchema = z.object({
  xy: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  autoPopup: z.boolean().optional(),
})

const dragPanelInfosKey = 'dragPanelInfos'
const dragPanelInfosSchema = z.record(dragPanelInfoSchema)
const dragPanelInfosStorage = createZodStorage(
  dragPanelInfosKey,
  dragPanelInfosSchema,
)

export const DragPanel: FC<DragPanelProps> = ({
  id,
  show = true,
  title,
  showFunc,
  clickAwayClose,
  children,
  xy,
  headerSlot,
  menuSlot,
  width,
  height,
  center,
  className,
  onMove,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const dragPanelInfo = id ? dragPanelInfosStorage.read()?.[id] : undefined

  const [zIndex, setZIndex] = useState(maxZIndex)
  const [autoPopup, setAutoPopup] = useState(() => dragPanelInfo?.autoPopup ?? false)
  const [position, setPosition] = useState(
    () => dragPanelInfo?.xy || xy || XY.$(480, 240),
  )

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const startXY = position
    Drag.onMove(({ shift }) => {
      const newPosition = XY.of(startXY).plus(shift)
      setPosition(newPosition)
      onMove?.(newPosition)
      if (!id) return
      dragPanelInfosStorage.savePartial({ [id]: { xy: newPosition } })
    }).start(e)
  }

  const handleAutoPopupChange = (value: boolean) => {
    setAutoPopup(value)
    if (!id) return
    dragPanelInfosStorage.savePartial({ [id]: { autoPopup: value } })
  }

  useLayoutEffect(() => {
    if (!show) return
    if (xy) setPosition(xy)
  }, [xy, show])

  useLayoutEffect(() => {
    if (!ref.current) return
    if (!center) return
    if (dragPanelInfo?.xy) return
    const bound = ref.current.getBoundingClientRect()
    setPosition(
      XY.$(innerWidth / 2 - bound.width / 2, innerHeight / 2 - bound.height / 2),
    )
  }, [center])

  useEffect(() => {
    panelCount++
    maxZIndex++
    return () => void panelCount--
  }, [])

  useEffect(() => {
    return listen('mousedown', () => {
      if (show && clickAwayClose) showFunc(false)
    })
  }, [show, clickAwayClose])

  const isFirstShow = useRef(false)
  const needFirstPopup = autoPopup && !isFirstShow.current

  useEffect(() => {
    needFirstPopup && showFunc(true)
    isFirstShow.current = true
  }, [])

  if (!show) return null

  const panel = (
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
        <G horizontal center className={cls('header-actions')}>
          <G className={cls('header-slot')}>{headerSlot}</G>
          <Menu
            x-if={!!id || !!menuSlot}
            className={cls('menu')}
            trigger={
              <Btn
                size={24}
                icon={<Lucide icon={EllipsisVertical} />}
                onMouseDown={stopPropagation()}
              />
            }>
            {menuSlot}
            <OptionBalanceItem
              x-if={!!id}
              label={t('auto popup')}
              checked={autoPopup}
              onChecked={handleAutoPopupChange}
              onMouseDown={stopPropagation()}
            />
          </Menu>
          <Btn
            size={24}
            icon={<Lucide icon={X} />}
            onMouseDown={stopPropagation()}
            onClick={() => showFunc(false)}
          />
        </G>
      </CommonBalanceItem>
      <G className={cls('content')}>{children}</G>
    </G>
  )

  return createPortal(panel, document.querySelector('#drag-panel-portal')!)
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
    &-actions {
      align-items: center;
      gap: 2px;
      height: 24px;
    }
  }
  &-content {
    height: 100%;
  }
  &-menu {
    width: 160px;
    position: relative;
    z-index: 10000;
  }
`)
