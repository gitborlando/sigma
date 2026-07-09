import { twoDecimal } from '@gitborlando/geo'
import { Icon } from '@gitborlando/widget'
import { type DesignGeomKey } from 'src/editor/workbench/design-panel/geom-field-definitions'
import { MULTI_VALUE } from 'src/global/constant'
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

export const RightPanelDesignGeom: FC<{}> = observer(({}) => {
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
        if (field.interaction !== 'number') return null

        const view = geomFieldViews[field.key]
        return (
          <GeomItem
            key={field.key}
            label={view.label}
            geomKey={field.key}
            value={currentGeom[field.key]}
            slideRate={view.slideRate?.(zoom)}
          />
        )
      })}
    </G>
  )
})

const GeomItem: FC<{
  label: ReactNode
  geomKey: DesignGeomKey
  value: number
  slideRate?: number
}> = observer(({ label, geomKey, value, slideRate = 1 }) => {
  const { designGeom, undo } = useEditorServices()
  const { endSetGeom, setGeom, slideGeom, startSetGeom } = designGeom
  const isMultiValue = T<any>(value) === MULTI_VALUE
  const nodes = useSelectNodes()
  const slideDeltaRef = useRef(0)

  const handleEnd = (value: number | null) => {
    setGeom(nodes, { [geomKey]: value ?? 0 })
    undo.track('state', `${t('modify geometry property')}: ${geomKey}`)
  }

  const handleBeforeSlide = () => {
    slideDeltaRef.current = 0
    startSetGeom(nodes)
  }

  const handleSlide = (delta: number) => {
    slideDeltaRef.current += delta
    slideGeom(nodes, { [geomKey]: slideDeltaRef.current })
  }

  const handleAfterSlide = (changed: boolean) => {
    endSetGeom()
    if (changed && isMultiValue)
      undo.track('state', `${t('modify geometry property')}: ${geomKey}`)
  }

  return (
    <InputNum
      prefix={label}
      value={isMultiValue ? undefined : twoDecimal(value)}
      slideRate={slideRate}
      beforeSlide={handleBeforeSlide}
      onSlide={handleSlide}
      afterSlide={handleAfterSlide}
      onEnd={handleEnd}
      {...(isMultiValue ? { placeholder: t('mixed') } : {})}
    />
  )
})
