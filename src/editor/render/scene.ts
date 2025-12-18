import { clone, createObjCache } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'
import { macroMatch } from 'src/shared/utils/normal'
import { SchemaUtil } from 'src/shared/utils/schema'
import { ImmutPatch } from 'src/utils/immut/immut'
import { Elem } from './elem'
import { StageSurface } from './surface'

@autobind
class StageSceneService {
  elements = createObjCache<Elem>()

  sceneRoot!: Elem
  widgetRoot!: Elem
  rootElems: Elem[] = []

  private disposer = new Disposer()

  subscribe() {
    return Disposer.collect(this.setupElems(), this.hookRenderNode())
  }

  findElem(id: string) {
    return this.elements.get(id)
  }

  elemsFromPoint(xy?: IXY) {
    return StageSurface.getElemsFromPoint(xy).filter(
      (elem) => elem.type === 'sceneElem',
    )
  }

  private setupElems() {
    this.elements.clear()
    this.sceneRoot = new Elem('sceneRoot', 'sceneElem')
    this.widgetRoot = new Elem('widgetRoot', 'widgetElem')
    this.sceneRoot.hitTest = () => true
    this.widgetRoot.hitTest = () => true
    this.rootElems.push(this.sceneRoot, this.widgetRoot)
    return () => {
      this.elements.clear()
      this.rootElems.forEach((elem) => elem.destroy())
      this.rootElems.length = 0
    }
  }

  private hookRenderNode() {
    return Signal.merge(YState.inited$, StageSurface.inited).hook(() => {
      this.disposer.add(
        autorun(() => {
          const pageId = YClients.client.selectPageId
          if (pageId) this.firstRenderPage()
        }),
        this.hookPatchRender(),
      )
    })
  }

  private firstRenderPage() {
    StageSurface.clearSurface()
    this.sceneRoot.children = []

    const traverse = (id: ID) => {
      const node = YState.find<V1.Node>(id)
      this.render('add', [node.id])
      if ('childIds' in node) node.childIds.forEach(traverse)
    }

    const page = YState.find<V1.Page>(YClients.client.selectPageId)
    page.childIds.forEach(traverse)
  }

  private hookPatchRender() {
    return YState.flushPatch$.hook((op) => {
      const { type, keys } = op
      if (keys[1] === 'childIds') this.reHierarchy(op)
      else this.render(type, keys as string[])
    })
  }

  private render(op: ImmutPatch['type'], keys: string[]) {
    const id = keys[0]
    if (macroMatch`'meta'|'client'`(id)) return

    const node = YState.find<V1.Node>(id)

    switch (true) {
      case op === 'add' && keys.length === 1:
        if (SchemaUtil.isPageById(id)) break
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

  private mountNode(node: V1.Node) {
    const parent = this.elements.get(node.parentId) || this.sceneRoot

    const elem = new Elem(node.id, 'sceneElem')
    this.elements.set(node.id, elem)
    parent.addChild(elem)

    this.updateNode(node)
  }

  private updateNode(node: V1.Node) {
    if (!node) return

    const elem = this.findElem(node.id)

    elem.node = clone(node)
    elem.optimize = true

    if (node.type === 'frame') elem.clip = true
  }

  private unmountNode(id: ID) {
    const elem = this.findElem(id)
    if (!elem) return

    elem.children.forEach((child) => {
      this.unmountNode(child.id)
    })

    elem.destroy()
    this.elements.delete(id)
  }

  private reHierarchy(patch: ImmutPatch) {
    const { type, keys, value } = patch
    const [id, _, index] = keys as [ID, string, number]
    const parent = this.findElem(id) || this.sceneRoot

    if (type === 'add') {
      const elem = this.findElem(value)
      const oldIndex = parent.children.indexOf(elem)
      if (oldIndex !== -1) parent.children.splice(oldIndex, 1)
      parent.children.splice(index, 0, elem)
    }

    if (parent !== this.sceneRoot) {
      StageSurface.collectDirty(parent)
    }
  }
}

export const StageScene = new StageSceneService()
