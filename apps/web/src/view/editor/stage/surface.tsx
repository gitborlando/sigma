import { useEditor } from 'src/view/hooks/editor'

export const EditorStageSurfaceComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const { stageSurface } = editor

  useLayoutEffect(() => {
    return stageSurface.inited.dispatch(true)
  }, [])

  return (
    <G className={cls()} ref={stageSurface.setContainer}>
      <canvas ref={stageSurface.setCanvas} />
      <canvas style={{ position: 'absolute' }} ref={stageSurface.setTopCanvas} />
    </G>
  )
})

const cls = classes(css`
  /* background-color: #f7f8fa; */
  background-color: var(--gray-bg);
`)
