import { iife } from '@gitborlando/utils'
import { withPrepare, withSuspense } from '@gitborlando/utils/react'
import { Editor } from 'src/editor'
import { createTextBreaker } from 'src/editor/render/text-break/text-breaker'
import { Loading } from 'src/view/component/loading'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import {
  EditorContext,
  useGlobal,
  useGlobalServices,
} from 'src/view/hooks/use-services'
import { suspend } from 'suspend-react'
import { EditorHeaderComp } from './header'

export const EditorComp = withSuspense(
  withPrepare(
    () => {
      const textBreaker = suspend(createTextBreaker, ['text-breaker'])
      return { textBreaker }
    },
    ({ textBreaker }) => {
      const global = useGlobal()
      const { fileId } = useParams<{ fileId: string }>()
      const { fileAction } = useGlobalServices()
      const [editor] = useState(() => new Editor(global))
      const [isSetup, setIsSetup] = useState(false)

      const elemDrawer = editor.resolve('elemDrawer')
      const stage = editor.resolve('stage')
      const stageCursor = editor.resolve('stageCursor')

      useEffect(() => {
        iife(async () => {
          elemDrawer.setTextBreaker(textBreaker)
          // 因为 FileAction 是 Global Service，你 dispose editor 是没用的
          await fileAction.setupFile(fileId!)
          if (!editor.disposed) setIsSetup(true)
        })
        return () => editor.dispose()
      }, [])

      useEffect(() => {
        if (!isSetup) return
        stage.onCanvasInited()
        stageCursor.setCursor('select')
      }, [isSetup])

      return (
        isSetup && (
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
      )
    },
  ),
  <Loading />,
)
