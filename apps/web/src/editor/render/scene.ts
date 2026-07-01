import { clone } from '@gitborlando/utils'
import { HandleSelectService } from 'src/editor/handle/select'
import { SchemaHelper } from 'src/editor/schema/helper'
import type { YStatePatch } from 'src/editor/y-adapter/y-state'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'
import { Elem } from './elem'
import { RenderInvalidatorService } from './invalidator'

export class StageSceneService extends Service {
  elements = new Map<string, Elem>()

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
    private readonly handleSelect: HandleSelectService,
    private readonly yState: YStateService,
    private readonly renderInvalidator: RenderInvalidatorService,
  ) {
    super()
    autoBind(this)
    this.setupElems()
  }

  findElem(id: string) {
    return this.elements.get(id)!
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

  firstRenderPage() {
    ;[...this.sceneRoot.children].forEach((child) => this.unmountNode(child.id))

    const traverse = (id: ID) => {
      const node = this.yState.find<S.Node>(id)
      this.render('add', [node.id])
      if ('childIds' in node) node.childIds.forEach(traverse)
    }

    const page = this.yState.find<S.Page>(this.handleSelect.selectPageId)
    page.childIds.forEach(traverse)
  }

  hookPatchRender() {
    return this.yState.flushPatch$.hook((op) => {
      const { type, keys } = op
      if (keys[1] === 'childIds') this.reHierarchy(op)
      else this.render(type, keys as string[])
    })
  }

  private render(op: YStatePatch['type'], keys: string[]) {
    const id = keys[0]
    if (id === 'meta' || id === 'client') return

    const node = this.yState.find<S.Node>(id)

    switch (true) {
      case op === 'add' && keys.length === 1:
        if (SchemaHelper.isPageById(id)) break
        this.mountNode(node)
        break
      case op === 'remove' && keys.length === 1:
        this.unmountNode(id)
        break
      default:
        this.updateNode(node)
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

    if (node.type === 'frame') elem.clip = true
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

  private reHierarchy(patch: YStatePatch) {
    const { type, keys } = patch
    const [id, _, index] = keys as [ID, string, number]
    const parent = this.findElem(id) || this.sceneRoot

    if (type === 'add') {
      const value = patch.value
      const elem = this.findElem(value)
      const oldIndex = parent.children.indexOf(elem)
      if (oldIndex !== -1) parent.children.splice(oldIndex, 1)
      parent.children.splice(index, 0, elem)
    }

    if (parent !== this.sceneRoot) parent.dirty()
  }

  private createElem(id = '', type: 'sceneElem' | 'widgetElem') {
    return new Elem({ renderInvalidator: this.renderInvalidator }, id, type)
  }
}
