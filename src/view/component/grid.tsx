import { iife } from '@gitborlando/utils'
import { ComponentPropsWithRef, CSSProperties } from 'react'

export type GridProps = {
  horizontal?: string | true
  vertical?: string | true
  center?: boolean
  gap?: CSSProperties['gap']
  jc?: CSSProperties['justifyContent']
  ji?: CSSProperties['justifyItems']
  ac?: CSSProperties['alignContent']
  ai?: CSSProperties['alignItems']
} & ComponentPropsWithRef<'div'>

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      children,
      style,
      className,
      horizontal,
      vertical,
      gap,
      center,
      jc,
      ji,
      ac,
      ai,
      ...rest
    },
    ref,
  ) => {
    const gridTemplates = useMemo(() => {
      const templates: Record<string, any> = {}
      if (horizontal) {
        if (horizontal === true) {
          templates.gridAutoFlow = 'column'
        } else {
          templates.gridTemplateColumns = horizontal
        }
      }
      if (vertical) {
        templates.gridTemplateRows = vertical
      }
      return templates
    }, [horizontal, vertical])

    const layoutCss = iife(() => {
      if (!center) return ''
      if (horizontal && vertical) return cls('c')
      if (!horizontal && !vertical) return cls('c')
      if (horizontal) return cls('h-c')
      if (vertical) return cls('v-c')
      return ''
    })

    return (
      <div
        className={cx(cls(), layoutCss, className)}
        style={{
          gap: gap,
          justifyContent: jc,
          justifyItems: ji,
          alignContent: ac,
          alignItems: ai,
          ...gridTemplates,
          ...style,
        }}
        {...rest}
        ref={ref}>
        {children}
      </div>
    )
  },
)

export const G = Grid

const cls = classes(css`
  width: 100%;
  height: 100%;
  position: relative;
  display: grid;
  &-c {
    place-content: center;
    place-items: center;
  }
  &-h-c {
    align-content: center;
    align-items: center;
  }
  &-v-c {
    justify-content: center;
    justify-items: center;
  }
`)
