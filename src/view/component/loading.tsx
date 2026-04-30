import { CSSProperties } from 'react'

export const Loading: FC<{
  size?: number
}> = memo(({ size = 37 }) => {
  return (
    <G className={cls()} center>
      <svg
        className={cls('svg')}
        x='0px'
        y='0px'
        viewBox='0 0 37 37'
        height='37'
        width='37'
        preserveAspectRatio='xMidYMid meet'
        style={{ overflow: 'visible', '--uib-size': `${size}px` } as CSSProperties}>
        <path
          className={cls('track')}
          fill='none'
          strokeWidth='5'
          pathLength='100'
          d='M0.37 18.5 C0.37 5.772 5.772 0.37 18.5 0.37 S36.63 5.772 36.63 18.5 S31.228 36.63 18.5 36.63 S0.37 31.228 0.37 18.5'></path>
        <path
          className={cls('car')}
          fill='none'
          strokeWidth='5'
          pathLength='100'
          d='M0.37 18.5 C0.37 5.772 5.772 0.37 18.5 0.37 S36.63 5.772 36.63 18.5 S31.228 36.63 18.5 36.63 S0.37 31.228 0.37 18.5'></path>
      </svg>
    </G>
  )
})

const cls = classes(css`
  width: 100%;
  height: 100%;

  &-svg {
    --uib-size: 37px;
    --uib-color: rgb(0, 100, 250);
    --uib-speed: 0.9s;
    --uib-bg-opacity: 0.1;
    height: var(--uib-size);
    width: var(--uib-size);
    transform-origin: center;
    overflow: visible;
  }

  &-car {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: var(--uib-color);
    stroke-dasharray: 15, 85;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: travel var(--uib-speed) linear infinite;
    will-change: stroke-dasharray, stroke-dashoffset;
    transition: stroke 0.5s ease;
  }

  &-track {
    width: 100%;
    height: 100%;
    stroke: var(--uib-color);
    opacity: var(--uib-bg-opacity);
    transition: stroke 0.5s ease;
  }

  @keyframes travel {
    0% {
      stroke-dashoffset: 0;
    }

    100% {
      stroke-dashoffset: -100;
    }
  }
`)

export const SigmaLoadingComp: FC<{}> = observer(({}) => {
  const cls = css`
    .logo-group {
      opacity: 1;
      animation: groupFade 3.2s ease-in-out infinite;
    }
    .logo-path {
      fill: #000;
      fill-opacity: 0;
      stroke: #000;
      stroke-opacity: 1;
      stroke-width: 1;
      stroke-linejoin: miter;
      stroke-linecap: square;
      vector-effect: non-scaling-stroke;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation:
        draw 3.2s cubic-bezier(0.33, 0, 0.2, 1) infinite,
        fillIntegrate 3.2s cubic-bezier(0.33, 0, 0.2, 1) infinite,
        softenStroke 3.2s cubic-bezier(0.33, 0, 0.2, 1) infinite;
    }
    @keyframes draw {
      0% {
        stroke-dashoffset: 1;
      }
      58% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }
    @keyframes fillIntegrate {
      0%,
      52% {
        fill-opacity: 0;
      }
      76% {
        fill-opacity: 1;
      }
      88% {
        fill-opacity: 1;
      }
      100% {
        fill-opacity: 1;
      }
    }
    @keyframes softenStroke {
      0%,
      52% {
        stroke-opacity: 1;
      }
      76% {
        stroke-opacity: 0.45;
      }
      88% {
        stroke-opacity: 0.4;
      }
      100% {
        stroke-opacity: 0.4;
      }
    }
    @keyframes groupFade {
      0%,
      88% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  `
  return <img src={Assets.favIcon.sigmaLoading2}></img>
})
