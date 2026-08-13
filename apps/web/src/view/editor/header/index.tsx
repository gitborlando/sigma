import { Menu, Redo, Undo as UndoIcon } from 'lucide-react'
import { IStageCreateType } from 'src/editor/stage/interact/create'
import { Btn } from 'src/view/component/btn'
import { EditableText } from 'src/view/component/editable-text'
import { Lucide } from 'src/view/component/lucide'
import { Icon } from 'src/view/component/svg-icon'
import { EditorHeaderDevSnapshotComp } from 'src/view/editor/header/dev-snapshot'
import { EditorHeaderHistoryComp } from 'src/view/editor/header/history'
import { EditorHeaderSettingComp } from 'src/view/editor/header/setting'
import { EditorHeaderZoomComp } from 'src/view/editor/header/zoom'
import { useDoc } from 'src/view/hooks/use-doc'
import { useEditorServices } from 'src/view/hooks/use-editor'

export const EditorHeaderComp: FC<{}> = observer(({}) => {
  const { stageViewport, stageCreate } = useEditorServices()
  const navigate = useNavigate()

  return (
    <G
      center
      horizontal='1fr auto 1fr'
      className={cls()}
      style={{ height: stageViewport.bound.top }}>
      <G center horizontal gap={4} jc='flex-start'>
        <Btn
          icon={<Lucide size={20} icon={Menu} />}
          size={32}
          onClick={() => navigate('/')}
          variant='ghost'
        />
        <DocNameComp />
      </G>
      <G center horizontal className={cls('centerGroup')}>
        <UndoGroup />
        <G center horizontal gap={4}>
          <StageOperateIcon type='select' />
          <StageOperateIcon type='move' />
        </G>
        <G center horizontal gap={4}>
          {stageCreate.createTypes.map((type) => (
            <CreateShapeIcon key={type} type={type} />
          ))}
        </G>
      </G>
      <G center horizontal gap={8} jc='flex-end'>
        <EditorHeaderDevSnapshotComp x-if={isDEV} />
        <EditorHeaderHistoryComp />
        <EditorHeaderSettingComp />
        <EditorHeaderZoomComp />
      </G>
    </G>
  )
})

const DocNameComp: FC<{}> = observer(({}) => {
  const [canEdit, setCanEdit] = useState(false)
  const { yDoc, undo } = useEditorServices()
  const docName = useDoc((doc) => doc.meta.name)

  const handleRename = (name: string) => {
    undo.untrack(() => yDoc.set<S.Meta>(['meta', 'name'], name))
    setCanEdit(false)
  }

  const DocNameCls = classes(css`
    & .div {
      font-size: 14px;
      line-height: 14px;
      font-weight: 600;
      transform: translateY(1px);
    }
    & .input {
      height: 14px;
      & input {
        font-size: 14px;
        line-height: 14px;
      }
    }
  `)

  return (
    <EditableText
      className={DocNameCls()}
      canEdit={canEdit}
      value={docName}
      onEnd={handleRename}
      onDoubleClick={() => setCanEdit(true)}
    />
  )
})

const StageOperateIcon: FC<{ type: 'select' | 'move' }> = observer(({ type }) => {
  const { stageInteract } = useEditorServices()
  const isActive = stageInteract.interaction === type

  return (
    <Btn
      size={32}
      active={isActive}
      icon={
        <Icon className={cls('centerGroup-icon')} src={Assets.editor.header[type]} />
      }
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
      icon={
        <Icon className={cls('centerGroup-icon')} src={Assets.editor.node[type]} />
      }
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

const cls = classes(css`
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
