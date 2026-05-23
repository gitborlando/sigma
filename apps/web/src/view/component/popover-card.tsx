export const PopoverCard = forwardRef<
  HTMLDivElement,
  ComponentPropsWithRef<'div'> & {}
>(({ className, ...rest }, ref) => {
  return <G className={cx(cls(), className, 'slide-down')} {...rest} ref={ref}></G>
})

const cls = classes(css`
  width: fit-content;
  height: fit-content;
  background-color: white;
  padding: 12px;
  margin-top: 12px;
  ${styles.shadow}
  ${styles.borderRadius}
`)
