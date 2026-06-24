import { useClean, withSuspense } from '@gitborlando/utils/react'
import { Editor } from 'src/editor'
import { StageSurface } from 'src/editor/render/surface'
import { YState } from 'src/editor/y-adapter/y-state'
import { Loading } from 'src/view/component/loading'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import { clear, suspend } from 'suspend-react'
import { HeaderComp } from './header'

export const EditorComp = withSuspense(
  ({}) => {
    const { fileId } = useParams<{ fileId: string }>()

    useMemo(() => Editor.init(), [])
    suspend(() => YState.initSchema(fileId!), [fileId])
    suspend(() => StageSurface.initTextBreaker(), ['initTextBreaker'])

    useClean(() => {
      Editor.dispose()
      clear([fileId])
    })

    return (
      <G vertical='auto 1fr'>
        <HeaderComp />
        <G horizontal='auto 1fr auto'>
          <LeftPanelComp />
          <StageComp />
          <RightPanelComp />
        </G>
      </G>
    )
  },
  <Loading />,
)
