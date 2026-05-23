import { StageSurface } from 'src/editor/render/surface'

export const EditorStageSurfaceComp: FC<{}> = observer(({}) => {
  useLayoutEffect(() => {
    return StageSurface.inited.dispatch(true)
  }, [])

  return (
    <G className={cls()} ref={StageSurface.setContainer}>
      <canvas ref={StageSurface.setCanvas} />
      <canvas style={{ position: 'absolute' }} ref={StageSurface.setTopCanvas} />
    </G>
  )
})

const cls = classes(css`
  /* background-color: #f7f8fa; */
  background-color: var(--gray-bg);
`)
