import { withSuspense } from '@gitborlando/utils/react'
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
    const editor = Editor.getInstance()

    const yState = editor.resolve('yState')
    const stageSurface = editor.resolve('stageSurface')

    suspend(() => yState.initSchema(fileId!), [fileId])
    suspend(() => stageSurface.initTextBreaker(), ['initTextBreaker'])

    useEffect(() => {
      const unsubscribe = editor.subscribe()
      return () => {
        unsubscribe()
        editor.dispose()
        clear([fileId])
      }
    }, [editor, fileId])

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
