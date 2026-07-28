import { match, objKeys } from '@gitborlando/utils'
import { ReactNode } from 'react'
import Reconciler, { HostConfig } from 'react-reconciler'
import { Elem, ElemEventsMap, ElemProps } from 'src/editor/render/elem/elem'

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

  createInstance(_, props, container) {
    const elem = new Elem(container.context, props.node.id, 'widgetElem')
    applyProps(elem, props)
    return elem
  },
  getPublicInstance(instance) {
    return instance
  },
  appendInitialChild(parent, child) {
    child.context = parent.context
    parent.addChild(child)
  },
  finalizeInitialChildren() {
    return false
  },
  appendChild(parent, child) {
    child.context = parent.context
    parent.addChild(child)
  },
  appendChildToContainer(container, child) {
    child.context = container.context
    container.addChild(child)
  },
  removeChild(_, child) {
    child.destroy()
  },
  removeChildFromContainer(_, child) {
    child.destroy()
  },
  insertBefore(parent, child, beforeChild) {
    child.context = parent.context
    parent.insertBefore(child, beforeChild!)
  },
  insertInContainerBefore(container, child, beforeChild) {
    child.context = container.context
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
    container?.children.forEach((child) => {
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

function applyProps(elem: Elem, props: ElemProps, oldProps?: ElemProps) {
  handleEvents('remove', elem, oldProps?.events || {})

  for (const key of objKeys(props)) {
    match(key, {
      node: () => {
        elem.node = props.node
        elem.dirty()
      },
      events: (key) => handleEvents('add', elem, props[key] || {}),
      children: () => {},
      _: () => ((elem as any)[key] = props[key]),
    })
  }
}

function handleEvents(
  action: 'add' | 'remove',
  elem: Elem,
  events: Partial<ElemEventsMap>,
) {
  for (const key of objKeys(events)) {
    action === 'add'
      ? elem.addEvent(key, events[key]!)
      : elem.removeEvent(key, events[key]!)
  }
}
