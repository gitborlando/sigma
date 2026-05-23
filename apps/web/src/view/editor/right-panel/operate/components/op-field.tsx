export const OpFieldComp: FC<{
  children: ReactNode
}> = observer(({ children }) => {
  return (
    <G vertical='auto 1fr' className={cls()}>
      {children}
    </G>
  )
})

export const OpFieldHeaderComp: FC<{
  title: string
  headerSlot: ReactNode
}> = observer(({ title, headerSlot }) => {
  return (
    <G horizontal='auto 1fr' center className={cls('header')}>
      <h4 className={cls('header-title')}>{title}</h4>
      <G horizontal center className={cls('header-slot')} gap={8}>
        {headerSlot}
      </G>
    </G>
  )
})

export const OpFieldContentComp: FC<{
  children: ReactNode
}> = observer(({ children }) => {
  return (
    <G className={cls('content')} gap={8}>
      {children}
    </G>
  )
})

const cls = classes(css`
  padding-inline: 12px 6px;
  padding-top: 6px;
  height: fit-content;
  ${styles.borderBottom}
  &-header {
    height: 28px;
    margin-bottom: 6px;
    &-title {
      ${styles.textHead}
      color: #2e2e2e;
    }
    &-slot {
      justify-content: end;
    }
  }
  &-content {
    align-content: start;
    margin-bottom: 12px;
  }
`)
