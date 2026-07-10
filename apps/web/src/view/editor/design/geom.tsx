import { twoDecimal } from '@gitborlando/geo'
import { Icon } from '@gitborlando/widget'
import { isNil } from 'es-toolkit'
import { type DesignGeomKey } from 'src/editor/workbench/design/geom/field-definitions'
import { MIXED_VALUE } from 'src/global/constant'
import { Btn } from 'src/view/component/btn'
import { InputNum } from 'src/view/component/input-num'
import { useEditorServices } from 'src/view/hooks/editor'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const DesignGeomComp: FC<{}> = observer(({}) => {
  const { designGeom, stageViewport, undo } = useEditorServices()
  const { currentFields, currentGeom, setGeom, setupGeom } = designGeom
  const currentKeys = new Set(currentFields.map(({ key }) => key))
  const { zoom } = stageViewport
  const nodes = useSelectNodes()

  const handleLockAspectRatio = () => {
    setGeom(nodes, { aspectRatio: currentGeom.aspectRatio !== true })
    undo.track('state', `${t('modify geometry property')}: aspectRatio`)
  }

  useLayoutEffect(() => setupGeom(nodes), [nodes, setupGeom])

  return (
    <G x-if={nodes.length > 0} className={cls()} horizontal='auto auto' gap={8}>
      <GeomItem
        label={<Icon url={Assets.editor.design.geom.x} />}
        geomKey='x'
        value={currentGeom.x as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <GeomItem
        label={<Icon url={Assets.editor.design.geom.y} />}
        geomKey='y'
        value={currentGeom.y as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <G className={cls('size')} horizontal='minmax(0, 1fr) minmax(0, 1fr)' gap={8}>
        <GeomItem
          label={<Icon url={Assets.editor.design.geom.width} />}
          geomKey='width'
          value={currentGeom.width as number | typeof MIXED_VALUE}
          slideRate={1 / zoom}
        />
        <Btn
          type='button'
          className={cls('lock-aspect-ratio')}
          title={t('lock aspect ratio')}
          active={currentGeom.aspectRatio === true}
          onClick={handleLockAspectRatio}
          icon={<Icon url={Assets.editor.design.geom.lockAspectRatio} />}
        />
        <GeomItem
          label={<Icon url={Assets.editor.design.geom.height} />}
          geomKey='height'
          value={currentGeom.height as number | typeof MIXED_VALUE}
          slideRate={1 / zoom}
        />
      </G>
      <GeomItem
        label={<Icon url={Assets.editor.design.geom.rotate} />}
        geomKey='rotation'
        value={currentGeom.rotation as number | typeof MIXED_VALUE}
      />
      <GeomItem
        x-if={currentKeys.has('radius')}
        label={<Icon url={Assets.editor.design.geom.cornerRadius} />}
        geomKey='radius'
        value={currentGeom.radius as number | typeof MIXED_VALUE}
        slideRate={1 / zoom}
      />
      <GeomItem
        x-if={currentKeys.has('startAngle')}
        label='起始角'
        geomKey='startAngle'
        value={currentGeom.startAngle as number | typeof MIXED_VALUE}
      />
      <GeomItem
        x-if={currentKeys.has('endAngle')}
        label='结束角'
        geomKey='endAngle'
        value={currentGeom.endAngle as number | typeof MIXED_VALUE}
      />
      <GeomItem
        x-if={currentKeys.has('innerRate')}
        label='内径比'
        geomKey='innerRate'
        value={currentGeom.innerRate as number | typeof MIXED_VALUE}
        slideRate={0.01}
      />
    </G>
  )
})

const cls = classes(css`
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
