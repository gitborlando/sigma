import { Icon } from '@gitborlando/widget'
import { ChevronLeft, Redo, Undo as UndoIcon } from 'lucide-react'
import { IStageCreateType } from 'src/editor/stage/interact/create'
import { Btn } from 'src/view/component/btn'
import { Lucide } from 'src/view/component/lucide'
import { CooperateComp } from 'src/view/editor/header/cooperate'
import { EditorHeaderDevSnapshotComp } from 'src/view/editor/header/dev-snapshot'
import { EditorHeaderHistoryComp } from 'src/view/editor/header/history'
import { EditorHeaderSettingComp } from 'src/view/editor/header/setting'
import { EditorHeaderZoomComp } from 'src/view/editor/header/zoom'
import { useEditor } from 'src/view/hooks/editor'

export const HeaderComp: FC<{}> = observer(({}) => {
  const editor = useEditor()
  const navigate = useNavigate()

  return (
    <G
      center
      horizontal='auto 1fr auto'
      className={cls()}
      style={{ height: editor.stageViewport.bound.top }}>
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
          {editor.stageCreate.createTypes.map((type) => (
            <CreateShapeIcon key={type} type={type} />
          ))}
        </G>
        <EditorHeaderZoomComp />
      </G>
      <G center horizontal gap={8} className={cls('rightGroup')}>
        <CooperateComp />
        <EditorHeaderHistoryComp />
        <EditorHeaderSettingComp />
      </G>
    </G>
  )
})

const StageOperateIcon: FC<{ type: 'select' | 'move' }> = observer(({ type }) => {
  const editor = useEditor()
  const { stageInteract } = editor
  const isActive = stageInteract.interaction === type
  const iconUrl = Assets.editor.header.stageOperate[type]

  return (
    <Btn
      size={32}
      active={isActive}
      icon={<Icon url={iconUrl} className={cls('centerGroup-icon')} />}
      onClick={() => (stageInteract.interaction = type)}
    />
  )
})

const CreateShapeIcon: FC<{ type: IStageCreateType }> = observer(({ type }) => {
  const editor = useEditor()
  const { stageCreate, stageInteract } = editor
  const isActive =
    stageInteract.interaction === 'create' && stageCreate.createType === type
  const iconUrl = Assets.editor.node[type as keyof typeof Assets.editor.node]

  return (
    <Btn
      size={32}
      icon={<Icon url={iconUrl} className={cls('centerGroup-icon')} />}
      active={isActive}
      onClick={action(() => {
        stageInteract.interaction = 'create'
        stageCreate.createType = type
      })}
    />
  )
})

const UndoGroup: FC<{}> = observer(() => {
  const editor = useEditor()
  const { undo } = editor

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
