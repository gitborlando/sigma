import { Icon } from '@gitborlando/widget'
import { HandleNode } from 'src/editor/handle/node'
import { AllGeometry, OperateGeometry } from 'src/editor/operate/geometry'
import { getZoom } from 'src/editor/stage/viewport'
import { MULTI_VALUE } from 'src/global/constant'
import { twoDecimal } from 'src/utils/common'
import { InputNum } from 'src/view/component/input-num'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorRightOperateGeo: FC<{}> = observer(({}) => {
  const { activeKeys, activeGeometry, setupActiveKeys, setupActiveGeometry } =
    OperateGeometry
  const nodes = useSelectNodes()

  useMemo(() => {
    setupActiveKeys(nodes)
    setupActiveGeometry(nodes)
  }, [nodes])

  return (
    <G x-if={nodes.length > 0} className={cls()} horizontal='auto auto' gap={8}>
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.x} />}
        operateKey='x'
        value={activeGeometry.x}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.y} />}
        operateKey='y'
        value={activeGeometry.y}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.w} />}
        operateKey='width'
        value={activeGeometry.width}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.h} />}
        operateKey='height'
        value={activeGeometry.height}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.rotate} />}
        operateKey='rotation'
        value={activeGeometry.rotation}
      />
      <GeometryItemComp
        x-if={activeKeys.has('radius')}
        label={<Icon url={Assets.editor.RP.operate.geo.radius} />}
        operateKey='radius'
        slideRate={1 / getZoom()}
        value={activeGeometry.radius}
      />
      <GeometryItemComp
        x-if={activeKeys.has('sides')}
        label='边数'
        operateKey='sides'
        slideRate={0.5 / getZoom()}
        value={activeGeometry.sides}
      />
      <GeometryItemComp
        x-if={activeKeys.has('pointCount')}
        label='角数'
        operateKey='pointCount'
        slideRate={0.01}
        value={activeGeometry.pointCount}
      />
      <GeometryItemComp
        x-if={activeKeys.has('startAngle')}
        label='起始角'
        operateKey='startAngle'
        value={activeGeometry.startAngle}
      />
      <GeometryItemComp
        x-if={activeKeys.has('endAngle')}
        label='结束角'
        operateKey='endAngle'
        value={activeGeometry.endAngle}
      />
      <GeometryItemComp
        x-if={activeKeys.has('innerRate')}
        label='内径比'
        operateKey='innerRate'
        slideRate={0.01}
        value={activeGeometry.innerRate}
      />
    </G>
  )
})

const GeometryItemComp: FC<{
  label: ReactNode
  operateKey: keyof AllGeometry
  value: number
  slideRate?: number
}> = observer(({ label, operateKey, value, slideRate = 1 }) => {
  const { setActiveGeometry } = OperateGeometry

  const isMultiValue = T<any>(value) === MULTI_VALUE
  const inputValue = useRef(0)

  const correctedValue = useMemo(() => {
    if (isMultiValue) return value
    if (operateKey === 'x' || operateKey === 'y') {
      const datum = HandleNode.datumXY[operateKey]
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
      const datum = HandleNode.datumXY[operateKey]
      const value = v + datum
      setActiveGeometry(operateKey, value, false)
    } else {
      setActiveGeometry(operateKey, v, false)
    }
    YUndo.track2('state', `${t('modify geometry property')}: ${operateKey}`)
  }

  const handleAfterSlide = () => {
    YUndo.track2('state', `${t('modify geometry property')}: ${operateKey}`)
  }

  return (
    <InputNum
      prefix={label}
      value={isMultiValue ? undefined : twoDecimal(correctedValue)}
      slideRate={slideRate}
      onSlide={(v) => setActiveGeometry(operateKey, correctSetValue(v))}
      afterSlide={handleAfterSlide}
      onEnd={handleEnd}
      {...(isMultiValue ? { placeholder: t('noun.multiValue') } : {})}
    />
  )
})

const cls = classes(css`
  padding: 12px;
  height: fit-content;
  ${styles.borderBottom}
`)
