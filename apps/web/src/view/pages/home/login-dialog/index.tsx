import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import { X } from 'lucide-react'
import { Lucide } from 'src/view/component/lucide'
import { useGlobalServices } from 'src/view/hooks/use-global'
import { MinimalLoginDialogComp } from './minimal-dialog'
import { SplitLoginDialogComp } from './split-dialog'

export type LoginDialogVariant = 'split' | 'minimal'

export type LoginDialogProps = {
  variant: LoginDialogVariant
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LoginDialogComp: FC<LoginDialogProps> = ({
  variant,
  open,
  onOpenChange,
}) => {
  const { auth } = useGlobalServices()
  const [mode, setMode] = useState<'options' | 'wechat'>('options')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setMode('options')
    setLoading(false)
    setError(null)
  }

  useEffect(() => {
    if (!open) reset()
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleGoogleLogin = async () => {
    if (loading) return

    setLoading(true)
    setError(null)
    try {
      await auth.signInWithOAuth({ provider: 'google' })
    } catch (cause) {
      console.error(cause)
      setError(t('google login failed'))
    } finally {
      setLoading(false)
    }
  }

  const contentProps = {
    mode,
    loading,
    error,
    onGoogleLogin: handleGoogleLogin,
    onWechatLogin: () => {
      setError(null)
      setMode('wechat')
    },
    onBack: () => setMode('options'),
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: nextOpen }) => handleOpenChange(nextOpen)}
      lazyMount
      unmountOnExit>
      <Portal>
        <Dialog.Backdrop className={cls('backdrop')} />
        <Dialog.Positioner className={cls('positioner')}>
          <Dialog.Content className={cls('content')}>
            <Dialog.Title className={cls('sr-only')}>{t('login')}</Dialog.Title>
            <Dialog.Description className={cls('sr-only')}>
              {t('login description')}
            </Dialog.Description>
            <Dialog.CloseTrigger className={cls('close')} aria-label={t('close')}>
              <Lucide icon={X} size={18} />
            </Dialog.CloseTrigger>
            {variant === 'split' ? (
              <SplitLoginDialogComp {...contentProps} />
            ) : (
              <MinimalLoginDialogComp {...contentProps} />
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

const cls = classes(css`
  &-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(11, 10, 24, 0.58);
    backdrop-filter: blur(12px) saturate(1.15);
    animation: login-fade-in 220ms ease both;
  }
  &-positioner {
    position: fixed;
    inset: 0;
    z-index: 1001;
    display: grid;
    place-items: center;
    padding: 20px;
    overflow: auto;
  }
  &-content {
    position: relative;
    outline: none;
    animation: login-dialog-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  &-close {
    position: absolute;
    z-index: 5;
    top: 16px;
    right: 16px;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(152, 162, 179, 0.2);
    border-radius: 50%;
    color: #667085;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition:
      transform 160ms ease,
      background 160ms ease,
      color 160ms ease;
    &:hover {
      transform: rotate(8deg) scale(1.06);
      color: #101828;
      background: white;
    }
  }
  &-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @keyframes login-fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes login-dialog-in {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.96);
      filter: blur(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &-backdrop,
    &-content {
      animation-duration: 1ms;
    }
  }
`)
