import { ComponentType, FC, ReactNode, Suspense } from 'react'

export const suspense = <P extends object = {}>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
): FC<P & { children?: ReactNode }> => {
  const SuspendComp: FC<P & { children?: ReactNode }> = (props) => {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }
  SuspendComp.displayName = `suspense(${Component.displayName || Component.name || 'Component'})`
  return SuspendComp
}
