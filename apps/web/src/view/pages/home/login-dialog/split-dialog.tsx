import { LoginContentComp, LoginContentProps } from './login-content'

export const SplitLoginDialogComp: FC<LoginContentProps> = (props) => {
  return (
    <div className={cls()}>
      <section className={cls('brand')}>
        <span className={cls('orb-one')} />
        <span className={cls('orb-two')} />
        <div className={cls('grid')} />
        <div className={cls('brand-logo')}>
          <img src={Assets.favIcon.sigmaLogoText2} />
          <span>CREATE WITHOUT LIMITS</span>
        </div>
        <div className={cls('showcase')}>
          <div className={cls('spark')}>✦</div>
          <h1>{t('shape ideas together')}</h1>
          <p>{t('sigma brand description')}</p>
          <div className={cls('chips')}>
            <span>{t('realtime')}</span>
            <span>{t('boundless canvas')}</span>
            <span>{t('creative flow')}</span>
          </div>
        </div>
        <div className={cls('status')}>
          <i /> SIGMA CLOUD · ONLINE
        </div>
      </section>
      <section className={cls('form')}>
        <LoginContentComp {...props} />
      </section>
    </div>
  )
}

const cls = classes(css`
  width: min(880px, calc(100vw - 40px));
  min-height: 540px;
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  overflow: hidden;
  border-radius: 28px;
  background: white;
  box-shadow:
    0 38px 100px rgba(16, 24, 40, 0.26),
    0 0 0 1px rgba(255, 255, 255, 0.75);
  &-brand {
    position: relative;
    overflow: hidden;
    padding: 38px;
    color: white;
    background: linear-gradient(145deg, #15122b 0%, #2a2260 50%, #4938bf 100%);
  }
  &-grid {
    position: absolute;
    inset: 0;
    opacity: 0.16;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
    background-size: 34px 34px;
    mask-image: linear-gradient(to bottom, black, transparent 90%);
  }
  &-orb-one,
  &-orb-two {
    position: absolute;
    border-radius: 50%;
    filter: blur(4px);
    animation: orb-float 7s ease-in-out infinite;
  }
  &-orb-one {
    width: 240px;
    height: 240px;
    top: -90px;
    right: -60px;
    background: radial-gradient(
      circle at 35% 35%,
      #a9fbff,
      #6f5cf6 52%,
      transparent 70%
    );
    opacity: 0.65;
  }
  &-orb-two {
    width: 190px;
    height: 190px;
    bottom: -80px;
    left: -50px;
    background: radial-gradient(
      circle at 55% 45%,
      #ff8dd8,
      #654af2 55%,
      transparent 72%
    );
    opacity: 0.48;
    animation-delay: -3s;
  }
  &-brand-logo {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    img {
      width: 92px;
      filter: brightness(0) invert(1);
    }
    span {
      font-size: 8px;
      letter-spacing: 1.6px;
      opacity: 0.55;
    }
  }
  &-showcase {
    position: relative;
    z-index: 1;
    margin-top: 118px;
    max-width: 360px;
    h1 {
      max-width: 330px;
      font-size: 42px;
      line-height: 1.02;
      letter-spacing: -2.4px;
    }
    p {
      margin-top: 20px;
      max-width: 330px;
      color: rgba(255, 255, 255, 0.68);
      font-size: 13px;
      line-height: 1.7;
    }
  }
  &-spark {
    margin-bottom: 16px;
    color: #c6beff;
    font-size: 26px;
    animation: sparkle 2.5s ease-in-out infinite;
  }
  &-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 30px;
    span {
      padding: 7px 10px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      font-size: 9px;
      letter-spacing: 0.4px;
    }
  }
  &-status {
    position: absolute;
    z-index: 1;
    left: 38px;
    bottom: 30px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 8px;
    letter-spacing: 1px;
    opacity: 0.62;
    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #66f3a5;
      box-shadow: 0 0 8px #66f3a5;
    }
  }
  &-form {
    min-width: 0;
    display: grid;
    place-items: center;
    padding: 54px 48px 42px;
    background:
      radial-gradient(circle at 100% 0%, #f0efff 0, transparent 38%), white;
  }
  @keyframes orb-float {
    0%,
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(-14px, 18px, 0) scale(1.06);
    }
  }
  @keyframes sparkle {
    0%,
    100% {
      opacity: 0.55;
      transform: rotate(0deg) scale(0.9);
    }
    50% {
      opacity: 1;
      transform: rotate(16deg) scale(1.1);
    }
  }
  @media (max-width: 720px) {
    & {
      width: min(420px, calc(100vw - 24px));
      min-height: auto;
      grid-template-columns: 1fr;
      border-radius: 22px;
    }
    &-brand {
      min-height: 150px;
      padding: 24px;
    }
    &-brand-logo span {
      display: none;
    }
    &-showcase {
      margin-top: 32px;
      h1 {
        font-size: 28px;
      }
      p {
        display: none;
      }
    }
    &-chips {
      display: none;
    }
    &-status {
      display: none;
    }
    &-form {
      padding: 32px 28px 28px;
    }
  }
`)
