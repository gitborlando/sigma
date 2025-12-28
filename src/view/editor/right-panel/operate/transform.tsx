import { IMatrix, Matrix } from 'src/editor/math'
import { getZoom } from 'src/editor/stage/viewport'
import { Btn } from 'src/view/component/btn'
import { InputNum } from 'src/view/component/input-num'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorDesignTransformComp: FC<{}> = observer(({}) => {
  const [node] = useSelectNodes()
  const [matrix, setMatrix] = useState(Matrix.identity().plain())
  const originNodeRef = useRef<V1.Node>(node)

  const beforeSetMatrix = () => {
    originNodeRef.current = node
  }

  const handleSetMatrix = (label: keyof IMatrix, value: number) => {
    const newMatrix = Matrix.of(matrix).set(label, value)
    setMatrix(newMatrix.plain())
  }

  const handleApplyMatrix = () => {
    const mrect = MRect.of(originNodeRef.current)
    mrect.transform(matrix)
    YState.set(`${node.id}.x`, mrect.x)
    YState.set(`${node.id}.y`, mrect.y)
    YState.set(`${node.id}.width`, mrect.width)
    YState.set(`${node.id}.height`, mrect.height)
    YState.set(`${node.id}.matrix`, mrect.matrix)
    YState.set(`${node.id}.rotation`, mrect.rotation)
    YState.next()
  }

  if (!node) return null
  return (
    <G className={cls()} horizontal='auto auto' gap={8}>
      <TransformComp
        key='a'
        label='a'
        value={matrix.a}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='b'
        label='b'
        value={matrix.b}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='c'
        label='c'
        value={matrix.c}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='d'
        label='d'
        value={matrix.d}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='tx'
        label='tx'
        value={matrix.tx}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='ty'
        label='ty'
        value={matrix.ty}
        beforeSetMatrix={beforeSetMatrix}
        setMatrix={handleSetMatrix}
      />
      <Btn variant='solid' onClick={handleApplyMatrix}>
        Apply
      </Btn>
    </G>
  )
})

const TransformComp: FC<{
  label: keyof IMatrix
  value: number
  beforeSetMatrix: () => void
  setMatrix: (label: keyof IMatrix, value: number) => void
}> = observer(({ label, value, beforeSetMatrix, setMatrix }) => {
  const handleChange = (value: number) => {
    setMatrix(label, value)
  }
  const handleSlide = (delta: number) => {
    handleChange(value + delta)
  }

  return (
    <InputNum
      prefix={label}
      slideRate={0.2 / getZoom()}
      value={value}
      beforeSlide={beforeSetMatrix}
      onSlide={handleSlide}
      onChange={handleChange}
    />
  )
})

const cls = classes(css`
  padding: 12px;
  height: fit-content;
  ${styles.borderBottom}
`)
