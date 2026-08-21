import { LoginContentComp, LoginContentProps } from './login-content'

export const MinimalLoginDialogComp: FC<LoginContentProps> = (props) => {
  return (
    <div className={cls()}>
      <span className={cls('glow')} />
      <div className={cls('logo')}>
        <img src={Assets.favIcon.sigmaLogoText2} />
      </div>
      <LoginContentComp {...props} showEyebrow={false} spacious />
    </div>
  )
}

const cls = classes(css`
  position: relative;
  width: min(380px, calc(100vw - 24px));
  height: 480px;
  display: grid;
  align-content: start;
  gap: 38px;
  overflow: hidden;
  padding: 28px 36px 30px;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(28px);
  box-shadow:
    0 32px 90px rgba(47, 38, 120, 0.2),
    0 0 0 1px rgba(98, 88, 245, 0.06);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: radial-gradient(
      rgba(98, 88, 245, 0.14) 0.7px,
      transparent 0.7px
    );
    background-size: 15px 15px;
    mask-image: linear-gradient(to bottom, black, transparent 38%);
  }
  &-glow {
    position: absolute;
    width: 280px;
    height: 220px;
    left: 50%;
    top: -150px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: #7d6df8;
    filter: blur(60px);
    opacity: 0.3;
  }
  &-logo {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    img {
      width: 88px;
    }
  }
  @media (max-width: 480px) {
    & {
      min-height: auto;
      gap: 32px;
      padding: 28px 24px 26px;
      border-radius: 14px;
    }
  }
`)
