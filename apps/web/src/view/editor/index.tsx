import { iife } from '@gitborlando/utils'
import { withPrepare, withSuspense } from '@gitborlando/utils/react'
import { ReactSVG } from 'react-svg'
import { Editor } from 'src/editor'
import { createTextBreaker } from 'src/editor/render/text-break/text-breaker'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import { EditorContext, useGlobal } from 'src/view/hooks/use-services'
import { suspend } from 'suspend-react'
import { EditorHeaderComp } from './header'

const SkeletonLoading: FC<{}> = observer(({}) => {
  return (
    <ReactSVG
      wrapper='svg'
      src={Assets.editor.skeleton}
      style={{ width: '100vw', height: '100vh' }}
    />
  )
})

export const EditorComp = withSuspense(
  withPrepare(
    () => {
      const textBreaker = suspend(createTextBreaker, ['text-breaker'])
      return { textBreaker }
    },
    ({ textBreaker }) => {
      const global = useGlobal()
      const { fileId } = useParams<{ fileId: string }>()
      const [editor] = useState(() => new Editor(global))
      const [isSetup, setIsSetup] = useState(false)

      const elemDrawer = editor.resolve('elemDrawer')
      const session = editor.resolve('session')

      useEffect(() => {
        elemDrawer.setTextBreaker(textBreaker)
        iife(async () => {
          await session.setupFile(fileId!)
          if (!editor.disposed) setIsSetup(true)
        })
        return () => editor.dispose()
      }, [])

      useEffect(() => {
        if (isSetup) return session.onCanvasInited()
      }, [isSetup])

      if (!isSetup) return <SkeletonLoading />
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
  ),
  <SkeletonLoading />,
)
