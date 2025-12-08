import { Icon } from '@gitborlando/widget'
import { HandleNode } from 'src/editor/handle/node'
import { DesignGeoInfo, DesignGeometry } from 'src/editor/operate/geometry'
import { getZoom } from 'src/editor/stage/viewport'
import { MULTI_VALUE } from 'src/global/constant'
import { twoDecimal } from 'src/utils/common'
import { InputNum } from 'src/view/component/input-num'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorRightOperateGeo: FC<{}> = observer(({}) => {
  const { currentKeys, currentGeometries, setupGeometries } = DesignGeometry
  const nodes = useSelectNodes()

  useMemo(() => setupGeometries(nodes), [nodes])

  return (
    <G x-if={nodes.length > 0} className={cls()} horizontal='auto auto' gap={8}>
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.x} />}
        operateKey='x'
        value={currentGeometries.x}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.y} />}
        operateKey='y'
        value={currentGeometries.y}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.w} />}
        operateKey='width'
        value={currentGeometries.width}
        slideRate={1 / getZoom()}
      />
      <GeometryItemComp
        label={<Icon url={Assets.editor.RP.operate.geo.h} />}
        operateKey='height'
        value={currentGeometries.height}
        slideRate={1 / getZoom()}
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
        slideRate={1 / getZoom()}
        value={currentGeometries.radius}
      />
      <GeometryItemComp
        x-if={currentKeys.has('sides')}
        label='边数'
        operateKey='sides'
        slideRate={0.5 / getZoom()}
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
  const { setGeometries } = DesignGeometry

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
      setGeometries({ [operateKey]: value }, { delta: false })
    } else {
      setGeometries({ [operateKey]: v }, { delta: false })
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
      onSlide={(v) => setGeometries({ [operateKey]: correctSetValue(v) })}
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
