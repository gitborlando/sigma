import { Icon } from '@gitborlando/widget'
import { twoDecimal } from '@sigma/utils/common'
import { DesignGeoInfo } from 'src/editor/operate/geometry'
import { MULTI_VALUE } from 'src/global/constant'
import { InputNum } from 'src/view/component/input-num'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorRightOperateGeo: FC<{}> = observer(({}) => {
  const { designGeometry } = useEditorServices()
  const { currentKeys, currentGeometries, setupGeometries } = designGeometry
  const nodes = useSelectNodes()
  const { stageViewport } = useEditorServices()
  const zoom = stageViewport.zoom

  useMemo(() => setupGeometries(nodes), [nodes, setupGeometries])

  return (
    <G x-if={nodes.length > 0} className={cls()} horizontal='auto auto' gap={8}>
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.x} />}
        operateKey='x'
        value={currentGeometries.x}
        slideRate={1 / zoom}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.y} />}
        operateKey='y'
        value={currentGeometries.y}
        slideRate={1 / zoom}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.w} />}
        operateKey='width'
        value={currentGeometries.width}
        slideRate={1 / zoom}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.h} />}
        operateKey='height'
        value={currentGeometries.height}
        slideRate={1 / zoom}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.rotate} />}
        operateKey='rotation'
        value={currentGeometries.rotation}
      />
      <GeometryItemComp
        x-if={currentKeys.has('radius')}
        label={<Icon url={Assets.editor.RP.operate.geo.radius} />}
        operateKey='radius'
        slideRate={1 / zoom}
        value={currentGeometries.radius}
      />
      <GeometryItemComp
        x-if={currentKeys.has('sides')}
        label='边数'
        operateKey='sides'
        slideRate={0.5 / zoom}
        value={currentGeometries.sides}
      />
      <GeometryItemComp
        x-if={currentKeys.has('pointCount')}
        label='角数'
        operateKey='pointCount'
        slideRate={0.01}
        value={currentGeometries.pointCount}
      />
      <GeometryItemComp
        x-if={currentKeys.has('startAngle')}
        label='起始角'
        operateKey='startAngle'
        value={currentGeometries.startAngle}
      />
      <GeometryItemComp
        x-if={currentKeys.has('endAngle')}
        label='结束角'
        operateKey='endAngle'
        value={currentGeometries.endAngle}
      />
      <GeometryItemComp
        x-if={currentKeys.has('innerRate')}
        label='内径比'
        operateKey='innerRate'
        slideRate={0.01}
        value={currentGeometries.innerRate}
      />
    </G>
  )
})

const GeometryItemComp: FC<{
  label: ReactNode
  operateKey: keyof DesignGeoInfo
  value: number
  slideRate?: number
}> = observer(({ label, operateKey, value, slideRate = 1 }) => {
  const { designGeometry } = useEditorServices()
  const { setGeometries } = designGeometry
  const { handleNode, undo } = useEditorServices()
  const isMultiValue = T<any>(value) === MULTI_VALUE
  const inputValue = useRef(0)

  const correctedValue = useMemo(() => {
    if (isMultiValue) return value
    if (operateKey === 'x' || operateKey === 'y') {
      const datum = handleNode.datumXY[operateKey]
      return value - datum
    }
    return value
  }, [value])
  inputValue.current = correctedValue

  const correctSetValue = (value: number) => {
    return value === undefined ? 0 : value
  }

  const handleEnd = (v: number) => {
    if (operateKey === 'x' || operateKey === 'y') {
      const datum = handleNode.datumXY[operateKey]
      const value = v + datum
      setGeometries({ [operateKey]: value }, { delta: false })
    } else {
      setGeometries({ [operateKey]: v }, { delta: false })
    }
    undo.track('state', `${t('modify geometry property')}: ${operateKey}`)
  }

  const handleAfterSlide = () => {
    undo.track('state', `${t('modify geometry property')}: ${operateKey}`)
  }

  return (
    <InputNum
      prefix={label}
      value={isMultiValue ? undefined : twoDecimal(correctedValue)}
      slideRate={slideRate}
      onSlide={(v) => setGeometries({ [operateKey]: correctSetValue(v) })}
      afterSlide={handleAfterSlide}
      onEnd={handleEnd}
      {...(isMultiValue ? { placeholder: t('mixed') } : {})}
    />
  )
})

const cls = classes(css`
  padding: 12px;
  height: fit-content;
  ${styles.borderBottom}
`)
