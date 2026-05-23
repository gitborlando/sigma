import { objKeys } from '@gitborlando/utils'
import { ReactNode } from 'react'
import Reconciler, { HostConfig } from 'react-reconciler'
import { Elem, ElemProps } from 'src/editor/render/elem'

function applyProps(elem: Elem, props: ElemProps, oldProps?: ElemProps) {
  const oldEvents = oldProps?.events || {}
  for (const key of objKeys(oldEvents)) {
    elem.removeEvent(key, oldEvents[key]!)
  }

  for (const key of objKeys(props)) {
    if (key === 'events') {
      const events = props.events || {}
      for (const eventType of objKeys(events)) {
        elem.addEvent(eventType, events[eventType]!)
      }
    } else if (key !== 'children') {
      elem[key] = props[key] as any
    }
  }
}

const hostConfig: HostConfig<
  'elem',
  ElemProps,
  Elem,
  Elem,
  Elem,
  Elem,
  Elem,
  Elem,
  Elem,
  any,
  any,
  any,
  any
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,

  createInstance(_, props) {
    const elem = new Elem(props.node.id, 'widgetElem')
    applyProps(elem, props)
    return elem
  },
  getPublicInstance(instance) {
    return instance
  },
  appendInitialChild(parent, child) {
    parent.addChild(child)
  },
  finalizeInitialChildren() {
    return false
  },
  appendChild(parent, child) {
    parent.addChild(child)
  },
  appendChildToContainer(container, child) {
    container.addChild(child)
  },
  removeChild(_, child) {
    child.destroy()
  },
  removeChildFromContainer(_, child) {
    child.destroy()
  },
  insertBefore(parent, child, beforeChild) {
    parent.insertBefore(child, beforeChild!)
  },
  insertInContainerBefore(container, child, beforeChild) {
    container.insertBefore(child, beforeChild)
  },
  prepareForCommit() {
    return null
  },
  resetAfterCommit() {},
  prepareUpdate(instance, type, oldProps, newProps) {
    applyProps(instance, newProps, oldProps)
  },
  commitUpdate() {},
  commitMount() {},
  getRootHostContext() {
    return null
  },
  getChildHostContext(parentHostContext) {
    return parentHostContext
  },
  shouldSetTextContent() {
    return false
  },
  clearContainer(container) {
    container.children.forEach((child) => {
      if (child.id !== 'outlineRoot') child.destroy()
    })
  },
  detachDeletedInstance(instance) {
    instance.destroy()
  },
  createTextInstance() {
    throw new Error('Function not implemented.')
  },
  preparePortalMount() {
    throw new Error('Function not implemented.')
  },
  scheduleTimeout() {
    throw new Error('Function not implemented.')
  },
  cancelTimeout() {
    throw new Error('Function not implemented.')
  },
  noTimeout: undefined,
  isPrimaryRenderer: false,
  getCurrentEventPriority() {
    throw new Error('Function not implemented.')
  },
  getInstanceFromNode() {
    throw new Error('Function not implemented.')
  },
  beforeActiveInstanceBlur() {
    throw new Error('Function not implemented.')
  },
  afterActiveInstanceBlur() {
    throw new Error('Function not implemented.')
  },
  prepareScopeUpdate() {
    throw new Error('Function not implemented.')
  },
  getInstanceFromScope() {
    throw new Error('Function not implemented.')
  },
}

const reconciler = Reconciler(hostConfig)

export function renderElem(reactNode: ReactNode, elem: Elem) {
  const root = reconciler.createContainer(
    elem,
    0,
    null,
    false,
    null,
    '',
    () => {},
    null,
  )
  reconciler.updateContainer(reactNode, root, null, () => {})
  return () => void reconciler.updateContainer(null, root, null, () => {})
}
