export const styles = {
  fitContent: 'width: fit-content; height: fit-content;',

  textActive: `color: var(--color);`,
  textLabel: `font-size: 12px;`,
  textCommon: `font-size: 13px;`,
  textHead: `font-size: 12px;font-weight: 600;line-height: 16px;`,

  borderRadius: 'border-radius: var(--border-radius);',
  borderRadiusSM: 'border-radius: var(--border-radius-sm);',
  needBorder: 'border: 1px solid transparent;',
  border: 'border: 1px solid var(--gray-border);',
  borderLeft: 'border-left: 1px solid var(--gray-border);',
  borderRight: 'border-right: 1px solid var(--gray-border);',
  borderBottom: 'border-bottom: 1px solid var(--gray-border);',
  borderTop: 'border-top: 1px solid var(--gray-border);',
  borderPrimary: `border: 1px solid var(--color);`,
  borderHoverPrimary: `&:hover {border: 1px solid var(--color);}`,

  bgPrimary: `background-color: var(--color-bg);&:hover {background-color: var(--color-bg);}`,
  bgHoverPrimary: `&:hover {background-color: var(--color-bg);}`,
  bgGray: `background-color: var(--gray-bg);`,
  bgHoverGray: `&:hover {background-color: var(--gray-bg);}`,

  shadow: `box-shadow: var(--shadow);`,

  focus: `&:has(input:focus) { background-color: white;outline: 1px solid var(--color);}`,

  divideY: `&>*+* { border-top: 1px solid var(--gray-border); }`,
}
