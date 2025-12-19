import { Icon } from '@gitborlando/widget'
import { ChevronLeft, Redo, Undo } from 'lucide-react'
import { IStageCreateType, StageCreate } from 'src/editor/stage/interact/create'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { StageViewport } from 'src/editor/stage/viewport'
import { Btn } from 'src/view/component/btn'
import { CooperateComp } from 'src/view/editor/header/cooperate'
import { EditorHeaderHistoryComp } from 'src/view/editor/header/history'
import { EditorHeaderSettingComp } from 'src/view/editor/header/setting'
import { EditorHeaderZoomComp } from 'src/view/editor/header/zoom'

export const HeaderComp: FC<{}> = observer(({}) => {
  const navigate = useNavigate()

  return (
    <G
      center
      horizontal='auto 1fr auto'
      className={cls()}
      style={{ height: StageViewport.bound.top }}>
      <Btn
        size={32}
        onClick={() => navigate('/')}
        variant='ghost'
        style={{ paddingLeft: 6, gap: 4 }}>
        <Lucide size={20} icon={ChevronLeft} />
        {t('file list')}
      </Btn>
      <G center horizontal gap={0} className={cls('centerGroup')}>
        <UndoGroup />
        <G center gap={4} horizontal>
          <StageOperateIcon type='select' />
          <StageOperateIcon type='move' />
        </G>
        <G center gap={4} horizontal>
          {StageCreate.createTypes.map((type) => (
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
  const isActive = StageInteract.interaction === type
  const iconUrl = Assets.editor.header.stageOperate[type]
  return (
    <Btn
      size={32}
      active={isActive}
      icon={<Icon url={iconUrl} className={cls('centerGroup-icon')} />}
      onClick={() => (StageInteract.interaction = type)}
    />
  )
})

const CreateShapeIcon: FC<{ type: IStageCreateType }> = observer(({ type }) => {
  const isActive =
    StageInteract.interaction === 'create' && StageCreate.currentType === type
  const iconUrl = Assets.editor.node[type as keyof typeof Assets.editor.node]
  return (
    <Btn
      size={32}
      icon={<Icon url={iconUrl} className={cls('centerGroup-icon')} />}
      active={isActive}
      onClick={action(() => {
        StageInteract.interaction = 'create'
        StageCreate.currentType = type
      })}
    />
  )
})

const UndoGroup: FC<{}> = observer(() => {
  return (
    <G horizontal gap={4}>
      <Btn
        size={32}
        icon={<Lucide icon={Undo} />}
        disabled={!YUndo.canUndo}
        onClick={YUndo.undo}
      />
      <Btn
        size={32}
        icon={<Lucide icon={Redo} />}
        disabled={!YUndo.canRedo}
        onClick={YUndo.redo}
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
