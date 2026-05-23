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
