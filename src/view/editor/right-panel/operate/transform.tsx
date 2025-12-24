import { IMatrix } from 'src/editor/math'
import { getZoom } from 'src/editor/stage/viewport'
import { InputNum } from 'src/view/component/input-num'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorDesignTransformComp: FC<{}> = observer(({}) => {
  const [node] = useSelectNodes()

  if (!node) return null
  return (
    <G className={cls()} horizontal='auto auto' gap={8}>
      <TransformComp key='a' node={node} label='a' />
      <TransformComp key='b' node={node} label='b' />
      <TransformComp key='c' node={node} label='c' />
      <TransformComp key='d' node={node} label='d' />
      <TransformComp key='tx' node={node} label='tx' />
      <TransformComp key='ty' node={node} label='ty' />
    </G>
  )
})

const TransformComp: FC<{
  node: V1.Node
  label: keyof IMatrix
}> = observer(({ node, label }) => {
  const oldValue = useRef(node.matrix[label])
  oldValue.current = node.matrix[label]

  const handleChange = (value: number) => {
    YState.set(`${node.id}.matrix.${label}`, value)
    YState.next()
  }
  const handleSlide = (delta: number) => {
    const value = oldValue.current + delta
    handleChange(value)
  }

  return (
    <InputNum
      prefix={label}
      slideRate={0.2 / getZoom()}
      value={node.matrix[label]}
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
