import { Signal } from '@gitborlando/signal'
import { clone } from '@gitborlando/utils'
import { findNode, findParent } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { createGraphTraverse } from 'src/editor/doc/traverse'
import { Select } from 'src/editor/select'
import type { YDocPatch } from 'src/editor/y-adapter/y-doc'
import { YDoc } from 'src/editor/y-adapter/y-doc'
import { GRAPHS } from 'src/global/constant'
import { Service } from '@gitborlando/di-service'
import { Elem } from './elem/elem'

export type RenderDirtyType = 'widget' | 'scene'

@reflection
export class RenderTree extends Service {
  elements = new Map<string, Elem>()
  dirtyElems = new Set<Elem>()
  hasDirty$ = Signal.create<RenderDirtyType>()

  sceneRoot!: Elem
  widgetRoot!: Elem
  rootElems: Elem[] = []

  get sceneElems() {
    return this.sceneRoot.children
  }
  get widgetElems() {
    return this.widgetRoot.children
  }

  constructor(
    private readonly select: Select,
    private readonly yDoc: YDoc,
  ) {
    super()
    autoBind(this)
    this.setupElems()
  }

  findElem(id: string) {
    return this.elements.get(id)!
  }

  pageFirstRender() {
    ;[...this.sceneRoot.children].forEach((child) => this.unmountNode(child.id))

    createGraphTraverse({
      enter: ({ graph }) => {
        if (!DocHelper.isNode(graph)) return false
        this.render('add', [GRAPHS, graph.id])
      },
    })(this.select.getSelectedPage().childIds)
  }

  onPatchRender() {
    this.effect(
      this.yDoc.flushPatch$.hook((op) => {
        const { type, keys } = op
        if (keys[2] === 'childIds') this.reHierarchy(op)
        else this.render(type, keys as string[])
      }),
    )
  }

  private setupElems() {
    this.elements.clear()
    this.rootElems.length = 0
    this.sceneRoot = this.createElem('sceneRoot', 'sceneElem')
    this.widgetRoot = this.createElem('widgetRoot', 'widgetElem')
    this.sceneRoot.hitTest = () => true
    this.widgetRoot.hitTest = () => true
    this.rootElems.push(this.sceneRoot, this.widgetRoot)
    this.effect(() => {
      this.elements.clear()
      this.rootElems.forEach((elem) => elem.destroy())
      this.rootElems.length = 0
    })
  }

  private render(op: YDocPatch['type'], keys: string[]) {
    if (keys[0] !== GRAPHS) return

    const id = keys[1]

    switch (true) {
      case op === 'add' && keys.length === 2:
        if (DocHelper.isPageById(id)) break
        this.mountNode(findNode(id))
        break
      case op === 'remove' && keys.length === 2:
        this.unmountNode(id)
        break
      default:
        this.updateNode(findNode(id))
        break
    }
  }

  private mountNode(node: S.Node) {
    const parent = this.elements.get(node.parentId) || this.sceneRoot

    const elem = this.createElem(node.id, 'sceneElem')
    this.elements.set(node.id, elem)
    parent.addChild(elem)

    this.updateNode(node)
  }

  private updateNode(node: S.Node) {
    if (!node) return

    const elem = this.findElem(node.id)

    elem.node = clone(node)
    elem.optimize = true
    elem.dirty()

    if (node.variant === 'frame') elem.clip = true
  }

  private unmountNode(id: ID) {
    const elem = this.findElem(id)
    if (!elem) return
    ;[...elem.children].forEach((child) => {
      this.unmountNode(child.id)
    })

    elem.destroy()
    this.elements.delete(id)
  }

  private reHierarchy(patch: YDocPatch) {
    const id = patch.keys[1] as ID
    const parentNode = findParent(id)
    if (!parentNode) return

    const parent = this.findElem(id) || this.sceneRoot
    const nextChildren: Elem[] = []

    parentNode.childIds.forEach((childId) => {
      const childElem = this.findElem(childId)
      if (!childElem) return

      if (childElem.parent && childElem.parent !== parent) {
        childElem.parent.removeChild(childElem)
      }

      childElem.parent = parent
      childElem.dirty()
      nextChildren.push(childElem)
    })

    parent.children = nextChildren
    parent.dirty()
  }

  private collectDirty(elem: Elem) {
    if (elem.type === 'sceneElem' && elem.id !== 'sceneRoot') {
      this.dirtyElems.add(elem)
      this.hasDirty$.dispatch('scene')
    } else if (elem.type === 'widgetElem') {
      this.hasDirty$.dispatch('widget')
    }
  }

  private createElem(id = '', type: 'sceneElem' | 'widgetElem') {
    return new Elem({ collectDirty: this.collectDirty }, id, type)
  }
}
