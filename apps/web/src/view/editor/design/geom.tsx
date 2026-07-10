import { twoDecimal } from '@gitborlando/geo'
import { Icon } from '@gitborlando/widget'
import { isNil } from 'es-toolkit'
import { type DesignGeomKey } from 'src/editor/workbench/design/geom/field-definitions'
import { MIXED_VALUE } from 'src/global/constant'
import { InputNum } from 'src/view/component/input-num'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

type GeomFieldView = {
  label: ReactNode
  slideRate?: (zoom: number) => number
}

const zoomSlideRate = (zoom: number) => 1 / zoom

const geomFieldViews: Record<DesignGeomKey, GeomFieldView> = {
  x: {
    label: <Icon url={Assets.editor.design.geom.x} />,
    slideRate: zoomSlideRate,
  },
  y: {
    label: <Icon url={Assets.editor.design.geom.y} />,
    slideRate: zoomSlideRate,
  },
  width: {
    label: <Icon url={Assets.editor.design.geom.width} />,
    slideRate: zoomSlideRate,
  },
  height: {
    label: <Icon url={Assets.editor.design.geom.height} />,
    slideRate: zoomSlideRate,
  },
  rotation: {
    label: <Icon url={Assets.editor.design.geom.rotate} />,
  },
  radius: {
    label: <Icon url={Assets.editor.design.geom.cornerRadius} />,
    slideRate: zoomSlideRate,
  },
  startAngle: {
    label: '起始角',
  },
  endAngle: {
    label: '结束角',
  },
  innerRate: {
    label: '内径比',
    slideRate: () => 0.01,
  },
}

export const DesignGeomComp: FC<{}> = observer(({}) => {
  const { designGeom, stageViewport } = useEditorServices()
  const { currentFields, currentGeom, setupGeom } = designGeom
  const { zoom } = stageViewport
  const nodes = useSelectNodes()

  useLayoutEffect(() => setupGeom(nodes), [nodes, setupGeom])

  const cls = classes(css`
    padding: 12px;
    height: fit-content;
    ${styles.borderBottom}
  `)
  return (
    <G x-if={nodes.length > 0} className={cls()} horizontal='auto auto' gap={8}>
      {currentFields.map((field) => {
        const view = geomFieldViews[field.key]
        switch (field.interaction) {
          case 'number':
            return (
              <GeomItem
                key={field.key}
                label={view.label}
                geomKey={field.key}
                value={currentGeom[field.key] as number | typeof MIXED_VALUE}
                slideRate={view.slideRate?.(zoom)}
              />
            )
          default:
            return null
        }
      })}
    </G>
  )
})

const GeomItem: FC<{
  label: ReactNode
  geomKey: DesignGeomKey
  value: number | typeof MIXED_VALUE
  slideRate?: number
}> = observer(({ label, geomKey, value, slideRate = 1 }) => {
  const { designGeom, undo } = useEditorServices()
  const { setGeom, setupSlideGeom } = designGeom
  const nodes = useSelectNodes()
  const slideSessionRef = useRef<ReturnType<typeof setupSlideGeom>>()

  const handleEnd = (value: number | typeof MIXED_VALUE | Nil) => {
    if (!isNil(value) && value !== MIXED_VALUE) setGeom(nodes, { [geomKey]: value })
    undo.track('state', `${t('modify geometry property')}: ${geomKey}`)
  }

  const handleBeforeSlide = () => {
    slideSessionRef.current = setupSlideGeom(nodes, geomKey)
  }

  const handleSlide = (delta: number) => {
    slideSessionRef.current?.(delta)
  }

  const handleAfterSlide = () => {
    slideSessionRef.current = undefined
  }

  return (
    <InputNum
      prefix={label}
      value={value === MIXED_VALUE ? value : twoDecimal(value)}
      specialValue={{ value: MIXED_VALUE, label: t('mixed') }}
      slideRate={slideRate}
      beforeSlide={handleBeforeSlide}
      onSlide={handleSlide}
      afterSlide={handleAfterSlide}
      onEnd={handleEnd}
    />
  )
})
