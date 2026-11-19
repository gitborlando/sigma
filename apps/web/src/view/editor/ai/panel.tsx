import { Sparkles } from 'lucide-react'
import { Btn } from '../../component/btn'
import { DragPanel } from '../../component/drag-panel'
import { Lucide } from '../../component/lucide'
import { useEditorServices } from '../../hooks/use-services'
import { AiConnectionForm } from './connection-form'
import { AiPromptForm } from './prompt-form'

export const AiPanel = () => {
  const { aiController } = useEditorServices()
  const [show, setShow] = useState(false)
  const panelPosition = useMemo(
    () => ({ x: Math.max(0, window.innerWidth - 416), y: 24 }),
    [],
  )
  useEffect(() => aiController.attach(), [aiController])
  const close = (value: boolean) => {
    setShow(value)
    if (!value) aiController.stop()
  }
  return (
    <>
      <Btn
        size={32}
        variant='ghost'
        aria-label='AI'
        icon={<Lucide icon={Sparkles} size={20} />}
        onClick={() => close(!show)}
      />
      <DragPanel
        id='ai'
        show={show}
        width={400}
        xy={panelPosition}
        title='AI'
        onShow={close}>
        <div className={cls()}>
          <AiConnectionForm />
          <AiPromptForm />
        </div>
      </DragPanel>
    </>
  )
}

const cls = classes(css`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  & label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  & input,
  & textarea {
    width: 100%;
    padding: 7px;
    border: 1px solid var(--gray-border);
    border-radius: 4px;
    background: transparent;
    color: inherit;
  }
`)
