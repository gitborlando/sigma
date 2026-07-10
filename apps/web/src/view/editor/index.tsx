import { withSuspense } from '@gitborlando/utils/react'
import { Editor } from 'src/editor'
import { createTextBreaker } from 'src/editor/render/text-break/text-breaker'
import { Loading } from 'src/view/component/loading'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import { EditorContext } from 'src/view/hooks/editor'
import { suspend } from 'suspend-react'
import { EditorHeaderComp } from './header'

export const EditorComp = withSuspense(
  ({}) => {
    const { fileId } = useParams<{ fileId: string }>()
    const editor = Editor.getInstance()

    const schemaController = editor.resolve('schemaController')
    const stageCursor = editor.resolve('stageCursor')
    const stageController = editor.resolve('stageController')
    const elemDrawer = editor.resolve('elemDrawer')

    const schema = suspend(() => schemaController.loadSchema(fileId!), [fileId])
    const textBreaker = suspend(() => createTextBreaker(), ['text-breaker'])

    schemaController.setupSchema(fileId!, schema)
    elemDrawer.setTextBreaker(textBreaker)

    useEffect(() => {
      stageController.onCanvasInited()
      stageCursor.setCursor('select')

      return () => editor.dispose()
    }, [editor, fileId])

    return (
      <EditorContext.Provider value={editor}>
        <G vertical='auto 1fr'>
          <EditorHeaderComp />
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
