import { ArrowLeft, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react'
import { Lucide } from 'src/view/component/lucide'

export type LoginContentProps = {
  mode: 'options' | 'wechat'
  loading: boolean
  error: string | null
  showEyebrow?: boolean
  spacious?: boolean
  onGoogleLogin: () => void
  onWechatLogin: () => void
  onBack: () => void
}

const BrandIcon: FC<{ brand: 'google' | 'wechat' }> = ({ brand }) => {
  const cls = classes(css`
    width: 28px;
    height: 28px;
  `)
  return <img className={cls()} src={Assets.editor.header.login[brand]} />
}

export const LoginContentComp: FC<LoginContentProps> = ({
  mode,
  loading,
  error,
  showEyebrow = false,
  spacious = false,
  onGoogleLogin,
  onWechatLogin,
  onBack,
}) => {
  if (mode === 'wechat') {
    return (
      <div className={cx(cls(), spacious && cls('spacious'), cls('wechat-view'))}>
        <button className={cls('back')} onClick={onBack}>
          <Lucide icon={ArrowLeft} size={16} />
          {t('back to login')}
        </button>
        <G horizontal center className={cls('wechat-title')}>
          <span className={cls('icon')}>
            <BrandIcon brand='wechat' />
          </span>
          <div>
            <h2>{t('wechat scan login')}</h2>
            <p>{t('wechat mock description')}</p>
          </div>
        </G>
        <img
          className={cls('qr-wrap')}
          src={Assets.editor.header.login.mockQr}></img>
        <G horizontal center className={cls('scan-tip')}>
          <Lucide icon={QrCode} size={16} />
          {t('open wechat to scan')}
        </G>
      </div>
    )
  }

  return (
    <div className={cx(cls(), spacious && cls('spacious'))}>
      <div className={cls('heading')}>
        {showEyebrow && (
          <span className={cls('eyebrow')}>{t('welcome to sigma')}</span>
        )}
        <h2>{t('sign in to continue')}</h2>
        <p>{t('login description')}</p>
      </div>
      <div className={cls('actions')}>
        <button
          className={cx(cls('login-button'), cls('google'))}
          disabled={loading}
          onClick={onGoogleLogin}>
          <span className={cls('icon')}>
            {loading ? (
              <Lucide icon={LoaderCircle} size={20} className={cls('spinner')} />
            ) : (
              <BrandIcon brand='google' />
            )}
          </span>
          <span>{loading ? t('connecting google') : t('continue with google')}</span>
        </button>
        <button
          className={cx(cls('login-button'), cls('wechat'))}
          disabled={loading}
          onClick={onWechatLogin}>
          <span className={cls('icon')}>
            <BrandIcon brand='wechat' />
          </span>
          <span>{t('continue with wechat')}</span>
        </button>
      </div>
      {error && (
        <p className={cls('error')} role='alert'>
          {error}
        </p>
      )}
      <div className={cls('security')}>
        <Lucide icon={ShieldCheck} size={14} />
        <span>{t('secure login notice')}</span>
      </div>
    </div>
  )
}

const cls = classes(css`
  width: 100%;
  display: grid;
  gap: 28px;
  color: #101828;
  &-spacious {
    gap: 36px;
  }
  &-heading {
    display: grid;
    gap: 8px;
    h2 {
      font-size: 28px;
      line-height: 1.15;
      letter-spacing: -1px;
    }
    p {
      color: #667085;
      font-size: 13px;
      line-height: 1.65;
    }
  }
  &-eyebrow {
    width: fit-content;
    color: #6558f5;
    background: #f0efff;
    border: 1px solid #dedbff;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  &-actions {
    display: grid;
    gap: 12px;
  }
  &-login-button {
    width: 100%;
    height: 52px;
    display: grid;
    grid-template-columns: 24px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    border: 1px solid #e4e7ec;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.82);
    color: #1d2939;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: #b9b4ff;
      box-shadow: 0 10px 28px rgba(98, 88, 245, 0.12);
    }
    &:active:not(:disabled) {
      transform: translateY(0);
    }
    &:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  }
  &-wechat:hover:not(:disabled) {
    border-color: #78dca0;
    box-shadow: 0 10px 28px rgba(7, 193, 96, 0.12);
  }
  &-icon {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    svg {
      width: 100%;
      height: 100%;
    }
  }
  &-arrow {
    color: #98a2b3;
    font-size: 18px;
  }
  &-mock-label,
  &-mock-badge {
    color: #08783c;
    background: #e8f9ef;
    border: 1px solid #b7ebcc;
    border-radius: 999px;
    padding: 3px 7px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.7px;
  }
  &-error {
    margin-top: -16px;
    color: #d92d20;
    font-size: 12px;
    text-align: center;
  }
  &-security {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #98a2b3;
    font-size: 10px;
  }
  &-spinner {
    animation: login-spin 0.8s linear infinite;
  }
  &-wechat-view {
    justify-items: center;
    gap: 22px;
  }
  &-back {
    justify-self: start;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    color: #667085;
    font-size: 12px;
    cursor: pointer;
    &:hover {
      color: #101828;
    }
  }
  &-wechat-title {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-self: stretch;
    h2 {
      font-size: 22px;
    }
    p {
      margin-top: 4px;
      color: #667085;
      font-size: 11px;
    }
  }
  &-qr-wrap {
    position: relative;
    width: 210px;
    height: 210px;
    padding: 14px;
    border-radius: 22px;
    background: white;
    box-shadow: 0 18px 50px rgba(16, 24, 40, 0.12);
    overflow: hidden;
  }
  &-qr {
    width: 100%;
    height: 100%;
    display: block;
  }
  &-scan-line {
    position: absolute;
    left: 14px;
    right: 14px;
    height: 2px;
    top: 18px;
    background: linear-gradient(90deg, transparent, #07c160, transparent);
    box-shadow: 0 0 12px #07c160;
    animation: qr-scan 2.2s ease-in-out infinite;
  }
  &-mock-badge {
    position: absolute;
    right: 10px;
    top: 10px;
  }
  &-scan-tip {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #667085;
    font-size: 12px;
  }
  @keyframes login-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes qr-scan {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    50% {
      transform: translateY(172px);
      opacity: 1;
    }
  }
`)
