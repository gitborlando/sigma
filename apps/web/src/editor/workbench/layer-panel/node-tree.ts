import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { EditorService } from 'src/editor/service'
import { getSelectPageId } from 'src/editor/utils/get'

export type LayerPanelNodeInfo = {
  id: string
  indent: number
  ancestorIds: string[]
}

export class LayerPanelNodeTreeService extends EditorService {
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

  subscribe() {
    return this.onNodeHierarchyChange()
  }

  getNodeExpanded(id: string) {
    if (!SchemaHelper.isNodeParent(this.editor.find(id))) return
    return this.expandedNodeMap.get(id)
  }

  toggleNodeExpanded(id: string, expanded: boolean) {
    this.expandedNodeMap.set(id, expanded)
  }

  toggleAllNodeExpanded(expanded: boolean) {
    const traverse = createSchemaTraverse({
      schema: this.editor.yState.schema,
      enter: ({ item }) => {
        if (!SchemaHelper.isNodeParent(item)) return
        this.expandedNodeMap.set(item.id, expanded)
      },
    })
    traverse(SchemaHelper.getPageChildIds(getSelectPageId(this.editor)))
  }

  private getNodeInfoList() {
    const nodeInfoList: LayerPanelNodeInfo[] = []
    const traverse = createSchemaTraverse({
      schema: this.editor.yState.schema,
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
    traverse(SchemaHelper.getPageChildIds(getSelectPageId(this.editor)))
    return nodeInfoList
  }

  private onNodeHierarchyChange() {
    return this.editor.yState.listen((patches) => {
      patches.forEach((patch) => {
        const [id, prop] = patch.keys as [string, string]
        if (prop !== 'childIds') return
        if (SchemaHelper.isPageById(id)) this.nodeInfoVersion++
        if (this.expandedNodeMap.get(id)) this.nodeInfoVersion++
      })
    })
  }
}
