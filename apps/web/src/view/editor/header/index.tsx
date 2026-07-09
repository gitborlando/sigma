import { ChevronLeft, Redo, Undo as UndoIcon } from 'lucide-react'
import { ReactSVG } from 'react-svg'
import { IStageCreateType } from 'src/editor/stage/interact/create'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { EditorHeaderDevSnapshotComp } from 'src/view/editor/header/dev-snapshot'
import { EditorHeaderHistoryComp } from 'src/view/editor/header/history'
import { EditorHeaderSettingComp } from 'src/view/editor/header/setting'
import { EditorHeaderZoomComp } from 'src/view/editor/header/zoom'
import { useEditorServices } from 'src/view/hooks/editor'

export const EditorHeaderComp: FC<{}> = observer(({}) => {
  const { stageViewport, stageCreate } = useEditorServices()
  const navigate = useNavigate()

  return (
    <G
      center
      horizontal='auto 1fr auto'
      className={cls()}
      style={{ height: stageViewport.bound.top }}>
      <G center horizontal gap={4}>
        <Btn
          size={32}
          onClick={() => navigate('/')}
          variant='ghost'
          style={{ paddingLeft: 6, gap: 4 }}>
          <Lucide size={20} icon={ChevronLeft} />
          {t('file list')}
        </Btn>
        {isDEV && <EditorHeaderDevSnapshotComp />}
      </G>
      <G center horizontal gap={0} className={cls('centerGroup')}>
        <UndoGroup />
        <G center gap={4} horizontal>
          <StageOperateIcon type='select' />
          <StageOperateIcon type='move' />
        </G>
        <G center gap={4} horizontal>
          {stageCreate.createTypes.map((type) => (
            <CreateShapeIcon key={type} type={type} />
          ))}
        </G>
        <EditorHeaderZoomComp />
      </G>
      <G center horizontal gap={8} className={cls('rightGroup')}>
        <EditorHeaderHistoryComp />
        <EditorHeaderSettingComp />
      </G>
    </G>
  )
})

const StageOperateIcon: FC<{ type: 'select' | 'move' }> = observer(({ type }) => {
  const { stageInteract } = useEditorServices()
  const isActive = stageInteract.interaction === type

  return (
    <Btn
      size={32}
      active={isActive}
      icon={<IconComp url={Assets.editor.header[type]} active={isActive} />}
      onClick={() => (stageInteract.interaction = type)}
    />
  )
})

const CreateShapeIcon: FC<{ type: IStageCreateType }> = observer(({ type }) => {
  const { stageCreate, stageInteract } = useEditorServices()
  const isActive =
    stageInteract.interaction === 'create' && stageCreate.createType === type

  return (
    <Btn
      size={32}
      icon={<IconComp url={Assets.editor.node[type]} active={isActive} />}
      active={isActive}
      onClick={action(() => {
        stageInteract.interaction = 'create'
        stageCreate.createType = type
      })}
    />
  )
})

const UndoGroup: FC<{}> = observer(() => {
  const { undo } = useEditorServices()
  return (
    <G horizontal gap={4}>
      <Btn
        size={32}
        icon={<Lucide icon={UndoIcon} />}
        disabled={!undo.canUndo}
        onClick={undo.undo}
      />
      <Btn
        size={32}
        icon={<Lucide icon={Redo} />}
        disabled={!undo.canRedo}
        onClick={undo.redo}
      />
    </G>
  )
})

const IconComp: FC<{
  url: string
  active: boolean
}> = observer(({ url, active }) => {
  return (
    <ReactSVG
      src={url}
      className={cls('centerGroup-icon')}
      beforeInjection={(s) => {
        s.setAttribute('width', '20')
        s.setAttribute('height', '20')
        s.querySelectorAll('[stroke-width]').forEach((el) => {
          el.setAttribute('stroke-width', '1.5')
        })
        if (active) {
          s.querySelectorAll('[stroke]').forEach((el) => {
            el.setAttribute('stroke', 'white')
          })
        }
      }}
    />
  )
})

const cls = classes(css`
  height: 48px;
  padding-inline: 8px;
  border-bottom: 1px solid var(--gray-border);

  &-centerGroup {
    justify-content: center;
    & > *:not(:last-child)::after {
      content: '';
      display: block;
      width: 1px;
      height: 20px;
      background-color: var(--gray-border);
      margin-top: 6px;
      margin-left: 4px;
      margin-right: 8px;
    }
    &-icon {
      width: 20px;
      height: 20px;
    }
  }
`)
