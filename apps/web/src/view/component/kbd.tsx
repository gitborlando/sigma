import { ComponentPropsWithRef, forwardRef } from 'react'

export interface KbdProps extends ComponentPropsWithRef<'kbd'> {
  /**
   * 快捷键字符串，如 'ctrl+c' 或 'ctrl+shift+z'
   * 也可以传入数组，如 ['ctrl', 'c']
   */
  keys?: string | string[]
  /**
   * 分隔符
   * @default '+'
   */
  separator?: string
  /**
   * 按键大小
   * @default 'small'
   */
  size?: 'small' | 'medium' | 'large'
}

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  (
    { className, keys, separator = '+', size = 'small', children, style, ...rest },
    ref,
  ) => {
    const cls = css`
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: inherit;
      &-key {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 6px;
        background-color: rgb(250, 250, 250);
        border: 1px solid rgb(229, 230, 235);
        border-radius: 4px;
        box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.05);
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        color: rgb(38, 38, 38);
        min-width: 20px;
        text-transform: lowercase;
        &[data-size='small'] {
          font-size: 11px;
          padding: 2px 6px;
          min-width: 20px;
        }
        &[data-size='medium'] {
          font-size: 12px;
          padding: 3px 8px;
          min-width: 24px;
        }
        &[data-size='large'] {
          font-size: 14px;
          padding: 4px 10px;
          min-width: 28px;
        }
      }
      &-separator {
        color: rgb(140, 140, 140);
        font-size: 12px;
        user-select: none;
      }
    `

    const parseKeys = (input: string | string[] | undefined): string[] => {
      if (!input) return []
      if (Array.isArray(input)) return input
      return input.split(/[+\-]/).map((k) => k.trim())
    }

    const keyList = parseKeys(keys)

    return (
      <kbd ref={ref} className={cx(cls, className)} style={style} {...rest}>
        {children
          ? children
          : keyList.map((key, index) => (
              <span key={index}>
                <span className={`${cls}-key`} data-size={size}>
                  {key}
                </span>
                {index < keyList.length - 1 && (
                  <span className={`${cls}-separator`}>{separator}</span>
                )}
              </span>
            ))}
      </kbd>
    )
  },
)

Kbd.displayName = 'Kbd'
