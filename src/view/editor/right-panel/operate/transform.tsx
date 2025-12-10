import { getZoom } from 'src/editor/stage/viewport'
import { SlideInput } from 'src/view/editor/right-panel/operate/components/slide-input'
import { useSelectNodes } from 'src/view/hooks/schema/use-y-state'

export const EditorDesignTransformComp: FC<{}> = observer(({}) => {
  const [node] = useSelectNodes()

  if (!node) return null
  return (
    <G className={cls()} horizontal='auto auto' gap={8}>
      <TransformComp key='a' node={node} index={0} />
      <TransformComp key='b' node={node} index={1} />
      <TransformComp key='c' node={node} index={2} />
      <TransformComp key='d' node={node} index={3} />
      <TransformComp key='tx' node={node} index={4} />
      <TransformComp key='ty' node={node} index={5} />
    </G>
  )
})

const TransformComp: FC<{
  node: V1.Node
  index: number
}> = observer(({ node, index }) => {
  const oldValue = useRef(node.transform[index])
  oldValue.current = node.transform[index]

  const handleChange = (value: number) => {
    YState.set(`${node.id}.transform.${index}`, value)
    YState.next()
  }
  const handleSlide = (delta: number) => {
    const value = oldValue.current + delta
    handleChange(value)
  }

  return (
    <SlideInput
      size='small'
      prefix={['a', 'b', 'c', 'd', 'tx', 'ty'][index]}
      slideRate={0.2 / getZoom()}
      value={node.transform[index]}
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
