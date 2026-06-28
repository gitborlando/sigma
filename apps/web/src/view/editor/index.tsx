import { useClean, withSuspense } from '@gitborlando/utils/react'
import { Editor } from 'src/editor'
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
    const { editor, dispose } = useMemo(() => Editor.initInstance(), [])

    const yState = editor.resolve('yState')
    const stageSurface = editor.resolve('stageSurface')

    suspend(() => yState.initSchema(fileId!), [fileId])
    suspend(() => stageSurface.initTextBreaker(), ['initTextBreaker'])

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
