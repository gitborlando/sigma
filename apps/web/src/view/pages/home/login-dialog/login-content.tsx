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
  if (brand === 'wechat') {
    return (
      <svg viewBox='0 0 24 24' aria-hidden='true'>
        <path
          fill='#07c160'
          d='M9.8 3.2c-4.4 0-8 2.9-8 6.6 0 2.1 1.2 4 3.1 5.2l-.8 2.5 2.9-1.4c.9.3 1.8.4 2.8.4h.5a5.8 5.8 0 0 1-.4-2.1c0-3.8 3.5-6.9 7.9-6.9h.3c-1.2-2.5-4.4-4.3-8.3-4.3Zm-2.7 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5.5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z'
        />
        <path
          fill='#07c160'
          d='M22.8 14.4c0-3.1-3-5.7-6.7-5.7s-6.7 2.6-6.7 5.7 3 5.7 6.7 5.7c.8 0 1.6-.1 2.3-.3l2.5 1.2-.7-2.1c1.6-1 2.6-2.6 2.6-4.5Zm-8.9-.8a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm4.5 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z'
        />
      </svg>
    )
  }

  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path
        fill='#4285f4'
        d='M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.5c2-1.9 3.2-4.6 3.2-7.7Z'
      />
      <path
        fill='#34a853'
        d='M12 22c2.9 0 5.3-1 7-2.6l-3.5-2.7c-.9.6-2.1 1-3.5 1a6.1 6.1 0 0 1-5.8-4.2H2.7v2.8A10.5 10.5 0 0 0 12 22Z'
      />
      <path
        fill='#fbbc05'
        d='M6.2 13.5a6.3 6.3 0 0 1 0-4V6.7H2.7a10.4 10.4 0 0 0 0 9.6l3.5-2.8Z'
      />
      <path
        fill='#ea4335'
        d='M12 5.3c1.6 0 3 .6 4.1 1.6l3.1-3A10.4 10.4 0 0 0 2.7 6.7l3.5 2.8A6.1 6.1 0 0 1 12 5.3Z'
      />
    </svg>
  )
}

const isFinderPixel = (x: number, y: number, offsetX: number, offsetY: number) => {
  const dx = x - offsetX
  const dy = y - offsetY
  if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return false
  return (
    dx === 0 ||
    dx === 6 ||
    dy === 0 ||
    dy === 6 ||
    (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
  )
}

const isInFinderArea = (x: number, y: number, offsetX: number, offsetY: number) =>
  x >= offsetX && x <= offsetX + 6 && y >= offsetY && y <= offsetY + 6

const MockQrCode = () => {
  const pixels = Array.from({ length: 21 * 21 }, (_, index) => {
    const x = index % 21
    const y = Math.floor(index / 21)
    const finder =
      isFinderPixel(x, y, 0, 0) ||
      isFinderPixel(x, y, 14, 0) ||
      isFinderPixel(x, y, 0, 14)
    const finderArea =
      isInFinderArea(x, y, 0, 0) ||
      isInFinderArea(x, y, 14, 0) ||
      isInFinderArea(x, y, 0, 14)
    const data = (x * 7 + y * 11 + x * y) % 5 < 2
    return finder || (!finderArea && data) ? (
      <rect key={index} x={x} y={y} width='1' height='1' />
    ) : null
  })

  return (
    <div className={cls('qr-wrap')}>
      <svg
        className={cls('qr')}
        viewBox='-2 -2 25 25'
        aria-label={t('mock wechat qr code')}>
        <rect x='-2' y='-2' width='25' height='25' rx='1.5' fill='white' />
        <g fill='#111827'>{pixels}</g>
      </svg>
      <span className={cls('scan-line')} />
      <span className={cls('mock-badge')}>MOCK</span>
    </div>
  )
}

export const LoginContentComp: FC<LoginContentProps> = ({
  mode,
  loading,
  error,
  showEyebrow = true,
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
        <MockQrCode />
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
          <span className={cls('arrow')}>↗</span>
        </button>
        <button
          className={cx(cls('login-button'), cls('wechat'))}
          disabled={loading}
          onClick={onWechatLogin}>
          <span className={cls('icon')}>
            <BrandIcon brand='wechat' />
          </span>
          <span>{t('continue with wechat')}</span>
          <span className={cls('mock-label')}>MOCK</span>
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
