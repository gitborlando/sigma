import { useClean, withSuspense } from '@gitborlando/utils/react'
import { EditorService2, StageSurface, YState } from 'src/editor'
import { Loading } from 'src/view/component/loading'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import { EditorContext } from 'src/view/hooks/editor'
import { clear, suspend } from 'suspend-react'
import { HeaderComp } from './header'

export const EditorComp = withSuspense(
  ({}) => {
    const { fileId } = useParams<{ fileId: string }>()

    const { editor, dispose } = useMemo(() => {
      const editor = autoBind(new EditorService2())
      const dispose = editor.subscribe()
      return { editor, dispose }
    }, [])

    suspend(() => YState.initSchema(fileId!), [fileId])
    suspend(() => StageSurface.initTextBreaker(), ['initTextBreaker'])

    useClean(() => {
      dispose()
      clear([fileId])
    })

    return (
      <EditorContext.Provider value={editor}>
        <G vertical='auto 1fr'>
          <HeaderComp />
          <G horizontal='auto 1fr auto'>
            <LeftPanelComp />
            <StageComp />
            <RightPanelComp />
          </G>
        </G>
      </EditorContext.Provider>
    )
  },
  <Loading />,
)
