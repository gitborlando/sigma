import { Editor } from 'src/editor/editor/editor'
import { StageSurface } from 'src/editor/render/surface'
import { Loading } from 'src/view/component/loading'
import { suspense } from 'src/view/component/suspense'
import { LeftPanelComp } from 'src/view/editor/left-panel'
import { RightPanelComp } from 'src/view/editor/right-panel'
import { StageComp } from 'src/view/editor/stage/stage'
import { useUnmount } from 'src/view/hooks/common'
import { clear, suspend } from 'suspend-react'
import { HeaderComp } from './header'

export const EditorComp: FC<{}> = suspense(
  ({}) => {
    const { fileId } = useParams<{ fileId: string }>()

    useMemo(() => Editor.initEditor(), [])
    suspend(() => Editor.initSchema(fileId!), [fileId])
    suspend(() => StageSurface.initTextBreaker(), ['initTextBreaker'])

    useUnmount(() => {
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
