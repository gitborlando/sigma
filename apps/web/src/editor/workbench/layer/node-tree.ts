import { makeObservable } from 'mobx'
import { HandleSelect } from 'src/editor/handle/select'
import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { YState } from 'src/editor/y-adapter/y-state'
import { Service } from 'src/global/service'

export type LayerNodeTreeInfo = { id: string; indent: number; ancestorIds: string[] }

@reflection
export class LayerNodeTree extends Service {
  private expandedNodeMap = observable.map<string, boolean>()
  @observable private nodeInfoVersion = 0

  @computed get nodeInfoList() {
    this.nodeInfoVersion
    return this.getNodeInfoList()
  }

  @computed get hasNodeExpanded() {
    for (const expanded of this.expandedNodeMap.values()) {
      if (expanded) return true
    }
    return false
  }

  constructor(
    private readonly handleSelect: HandleSelect,
    private readonly yState: YState,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(this.onNodeHierarchyChange())
  }

  getNodeExpanded(id: string) {
    if (!SchemaHelper.isNodeParent(this.yState.find(id))) return
    return this.expandedNodeMap.get(id)
  }

  toggleNodeExpanded(id: string, expanded: boolean) {
    this.expandedNodeMap.set(id, expanded)
  }

  toggleAllNodeExpanded(expanded: boolean) {
    const traverse = createSchemaTraverse({
      enter: ({ item }) => {
        if (!SchemaHelper.isNodeParent(item)) return
        this.expandedNodeMap.set(item.id, expanded)
      },
    })
    traverse(SchemaHelper.getPageChildIds(this.handleSelect.selectPageId))
  }

  private getNodeInfoList() {
    const nodeInfoList: LayerNodeTreeInfo[] = []
    const traverse = createSchemaTraverse({
      enter: ({ item, ancestors }) => {
        const ancestorIds = ancestors.map((node) => node.id)
        nodeInfoList.push({
          id: item.id,
          indent: ancestorIds.length,
          ancestorIds: ancestorIds,
        })
        return !!this.expandedNodeMap.get(item.id)
      },
    })
    traverse(SchemaHelper.getPageChildIds(this.handleSelect.selectPageId))
    return nodeInfoList
  }

  private onNodeHierarchyChange() {
    return this.yState.listen((patches) => {
      patches.forEach((patch) => {
        const [id, prop] = patch.keys as [string, string]
        if (prop !== 'childIds') return
        if (SchemaHelper.isPageById(id)) this.nodeInfoVersion++
        if (this.expandedNodeMap.get(id)) this.nodeInfoVersion++
      })
    })
  }
}
