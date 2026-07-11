import { twoDecimal } from '@gitborlando/geo'
import { isNil } from 'es-toolkit'
import {
  type DesignGeomFieldValue,
  type DesignGeomKey,
} from 'src/editor/workbench/design/geom/field-definitions'
import { MIXED_VALUE } from 'src/global/constant'
import { Btn } from 'src/view/component/btn'
import { InputNum, type InputNumProps } from 'src/view/component/input-num'
import { Icon } from 'src/view/component/svg-icon'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

const useSetGeomValue = () => {
  const { designGeom, undo } = useEditorServices()
  const nodes = useSelectNodes()

  return (geomKey: DesignGeomKey, value: DesignGeomFieldValue) => {
    designGeom.setGeom(nodes, { [geomKey]: value })
    undo.track('state', `${t('modify geometry property')}: ${geomKey}`)
  }
}

export const DesignGeomComp: FC<{}> = observer(({}) => {
  const { designGeom, stageViewport } = useEditorServices()
  const { currentFields, currentGeom, setupGeom } = designGeom
  const currentKeys = new Set(currentFields.map(({ key }) => key))
  const { zoom } = stageViewport
  const nodes = useSelectNodes()
  const setGeomValue = useSetGeomValue()

  useLayoutEffect(() => setupGeom(nodes), [nodes, setupGeom])

  return (
    <G
      x-if={nodes.length > 0}
      className={designGeomCls()}
      horizontal='auto auto'
      gap={8}>
      <GeomItem
        label={<Icon src={Assets.editor.design.geom.x} />}
        geomKey='x'
        value={currentGeom.x as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <GeomItem
        label={<Icon src={Assets.editor.design.geom.y} />}
        geomKey='y'
        value={currentGeom.y as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <G
        className={designGeomCls('size')}
        horizontal='minmax(0, 1fr) minmax(0, 1fr)'
        gap={8}>
        <GeomItem
          label={<Icon src={Assets.editor.design.geom.width} />}
          geomKey='width'
          value={currentGeom.width as number | typeof MIXED_VALUE}
          slideRate={1 / zoom}
        />
        <Btn
          type='button'
          className={designGeomCls('lock-aspect-ratio')}
          title={t('lock aspect ratio')}
          active={currentGeom.aspectRatio === true}
          onClick={() => {
            setGeomValue('aspectRatio', currentGeom.aspectRatio !== true)
          }}
          icon={<Icon src={Assets.editor.design.geom.lockAspectRatio} />}
        />
        <GeomItem
          label={<Icon src={Assets.editor.design.geom.height} />}
          geomKey='height'
          value={currentGeom.height as number | typeof MIXED_VALUE}
          slideRate={1 / zoom}
        />
      </G>
      <GeomItem
        label={<Icon src={Assets.editor.design.geom.rotate} />}
        geomKey='rotation'
        value={currentGeom.rotation as number | typeof MIXED_VALUE}
        formatter={angleFormatter}
        parser={angleParser}
      />
      <FlipComp />
      <GeomItem
        x-if={currentKeys.has('radius')}
        label={<Icon src={Assets.editor.design.geom.cornerRadius} />}
        geomKey='radius'
        value={currentGeom.radius as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <ArcGeomComp x-if={currentKeys.has('startAngle')} />
    </G>
  )
})

const FlipComp: FC<{}> = observer(({}) => {
  const { designGeom, undo } = useEditorServices()
  const { currentGeom, setupSlideGeom } = designGeom
  const nodes = useSelectNodes()
  const setGeomValue = useSetGeomValue()

  const handleFlip = (mask: 1 | 2) => {
    const flip =
      currentGeom.flip === MIXED_VALUE ? mask : (currentGeom.flip as number) ^ mask
    setGeomValue('flip', flip)
  }

  const handleRotate90 = () => {
    setupSlideGeom(nodes, 'rotation')?.(90)
    undo.track('state', `${t('modify geometry property')}: rotation`)
  }

  return (
    <G className={flipCls()} horizontal='repeat(3, minmax(0, 1fr))'>
      <Btn
        type='button'
        size={30}
        className={flipCls('button')}
        title='flipX'
        onClick={() => handleFlip(1)}
        icon={<Icon src={Assets.editor.design.geom.flipHorizontal} />}
      />
      <Btn
        type='button'
        size={30}
        className={flipCls('button')}
        title='flipY'
        onClick={() => handleFlip(2)}
        icon={<Icon src={Assets.editor.design.geom.flipVertical} />}
      />
      <Btn
        type='button'
        size={30}
        className={flipCls('button')}
        title='rotate90'
        onClick={handleRotate90}
        icon={<Icon src={Assets.editor.design.geom.rotate90} />}
      />
    </G>
  )
})

type ArcGeomValue = number | typeof MIXED_VALUE

const angleFormatter: InputNumProps['formatter'] = (value, { userTyping, input }) =>
  userTyping ? input : `${twoDecimal(Number(value ?? 0))}°`
const angleParser: InputNumProps['parser'] = (value) =>
  Number(value?.replace('°', ''))

const ArcGeomComp: FC<{}> = observer(({}) => {
  const { designGeom } = useEditorServices()
  const { currentGeom } = designGeom
  const startAngle = currentGeom.startAngle as ArcGeomValue
  const sweepAngle = currentGeom.sweepAngle as ArcGeomValue
  const innerRate = currentGeom.innerRate as ArcGeomValue

  return (
    <G className={arcGeomCls()} horizontal='1.2fr 1fr 1fr'>
      <GeomItem
        className={arcGeomCls('input')}
        label={<Icon src={Assets.editor.design.geom.innerRadiusRatio} />}
        value={startAngle}
        geomKey='startAngle'
        formatter={angleFormatter}
        parser={angleParser}
      />
      <GeomItem
        className={arcGeomCls('input')}
        label={<span className={arcGeomCls('slide-handle')} />}
        value={sweepAngle}
        geomKey='sweepAngle'
        formatter={angleFormatter}
        parser={angleParser}
      />
      <GeomItem
        className={arcGeomCls('input')}
        label={<span className={arcGeomCls('slide-handle')} />}
        value={innerRate}
        geomKey='innerRate'
        slideRate={0.01}
        formatter={(value, { userTyping, input }) =>
          userTyping ? input : `${twoDecimal(Number(value ?? 0) * 100)}%`
        }
        parser={(value) => Number(value?.replace('%', '')) / 100}
      />
    </G>
  )
})

const GeomItem: FC<{
  className?: string
  label: ReactNode
  geomKey: DesignGeomKey
  value: number | typeof MIXED_VALUE
  slideRate?: number
  formatter?: InputNumProps['formatter']
  parser?: InputNumProps['parser']
}> = observer(
  ({
    className,
    label,
    geomKey,
    value,
    slideRate = 1,
    parser,
    formatter = ((value, { userTyping, input }) =>
      userTyping || isNil(value)
        ? input
        : `${twoDecimal(Number(value))}`) as InputNumProps['formatter'],
  }) => {
    const { designGeom } = useEditorServices()
    const { setupSlideGeom } = designGeom
    const nodes = useSelectNodes()
    const setGeomValue = useSetGeomValue()
    const slideSessionRef = useRef<ReturnType<typeof setupSlideGeom>>()

    const handleEnd = (value: number | typeof MIXED_VALUE | Nil) => {
      if (!isNil(value) && value !== MIXED_VALUE) setGeomValue(geomKey, value)
    }

    return (
      <InputNum
        className={className}
        prefix={label}
        value={value}
        formatter={formatter}
        parser={parser}
        specialValue={{ value: MIXED_VALUE, label: t('mixed') }}
        slideRate={slideRate}
        beforeSlide={() =>
          (slideSessionRef.current = setupSlideGeom(nodes, geomKey))
        }
        onSlide={(delta) => slideSessionRef.current?.(delta)}
        onEnd={handleEnd}
      />
    )
  },
)

const designGeomCls = classes(css`
  padding: 12px;
  height: fit-content;
  ${styles.borderBottom}

  &-size {
    grid-column: 1 / -1;
  }
  &-lock-aspect-ratio {
    position: absolute;
    z-index: 1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: transparent;
    color: rgba(0, 0, 0, 0.65);
    &:hover,
    &[data-active='true'] {
      background: transparent;
      color: var(--color);
    }
  }
`)

const flipCls = classes(css`
  overflow: hidden;
  ${styles.borderRadius}

  &-button {
    width: 100%;
    border-radius: 0;
    background: var(--gray-bg);
    & + & {
      border-left: 1px solid var(--gray-border);
    }
  }
`)

const arcGeomCls = classes(css`
  grid-column: 1 / -1;
  overflow: hidden;
  background: var(--gray-bg);
  ${styles.borderRadius}
  &:focus-within {
    background: white;
    outline: 1px solid var(--color);
    outline-offset: -1px;
  }

  &-input {
    border-radius: 0;
    background: transparent;
    &:focus-within {
      position: relative;
      z-index: 1;
      outline: none;
      background: transparent;
    }
    & + & {
      border-left: 1px solid var(--gray-border);
    }
  }
  &-slide-handle {
    width: 4px;
    height: 16px;
  }
`)
