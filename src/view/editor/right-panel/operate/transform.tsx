import { IMatrix, Matrix } from 'src/editor/math'
import { getZoom } from 'src/editor/stage/viewport'
import { Btn } from 'src/view/component/btn'
import { InputNum } from 'src/view/component/input-num'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorDesignTransformComp: FC<{}> = observer(({}) => {
  const [node] = useSelectNodes()
  const [matrix, setMatrix] = useState(Matrix.identity().plain())

  const handleSetMatrix = (label: keyof IMatrix, value: number) => {
    const newMatrix = Matrix.of(matrix).set(label, value)
    setMatrix(newMatrix.plain())
  }

  const handleApplyMatrix = () => {
    const mrect = MRect.from(node)
    mrect.transform(matrix)
    YState.set(`${node.id}.x`, mrect.xy.x)
    YState.set(`${node.id}.y`, mrect.xy.y)
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
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='b'
        label='b'
        value={matrix.b}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='c'
        label='c'
        value={matrix.c}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='d'
        label='d'
        value={matrix.d}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='tx'
        label='tx'
        value={matrix.tx}
        setMatrix={handleSetMatrix}
      />
      <TransformComp
        key='ty'
        label='ty'
        value={matrix.ty}
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
  setMatrix: (label: keyof IMatrix, value: number) => void
}> = observer(({ label, value, setMatrix }) => {
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
