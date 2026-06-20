import { SchemaHelper } from 'src/editor/schema/helper'
import { createSchemaTraverse } from 'src/editor/schema/traverse'
import { getSelectPageId } from 'src/editor/utils/get'

export type EditorLPLayerNodeInfo = {
  id: string
  indent: number
  ancestors: string[]
}

class EditorLPLayerNodeStateService {
  nodeInfoChanged = Signal.create<void>()

  private nodeExpandedMap = observable.map<string, boolean>()

  init() {
    return this.onNodeHierarchyChange()
  }

  getNodeExpanded(id: string) {
    return this.nodeExpandedMap.get(id)
  }

  getAllNodeExpanded() {
    for (const expanded of this.nodeExpandedMap.values()) {
      if (expanded) return true
    }
    return false
  }

  toggleNodeExpanded(id: string, expanded: boolean) {
    this.nodeExpandedMap.set(id, expanded)
  }

  toggleAllNodeExpanded(expanded: boolean) {
    const traverse = createSchemaTraverse({
      schema: YState.schema,
      enter: ({ item }) => void this.nodeExpandedMap.set(item.id, expanded),
    })
    traverse(SchemaHelper.getPageChildIds(getSelectPageId()))
  }

  getNodeInfoList() {
    const nodeInfoList: EditorLPLayerNodeInfo[] = []
    const traverse = createSchemaTraverse({
      schema: YState.schema,
      enter: ({ item, ancestors }) => {
        const ancestorIds = ancestors.map((node) => node.id)
        nodeInfoList.push({
          id: item.id,
          indent: ancestorIds.length,
          ancestors: ancestorIds,
        })
        return !!this.nodeExpandedMap.get(item.id)
      },
    })
    traverse(SchemaHelper.getPageChildIds(getSelectPageId()))
    return nodeInfoList
  }

  private onNodeHierarchyChange() {
    let changed = false
    return YState.immut.subscribe((patches) => {
      patches.forEach((patch) => {
        const [id, prop] = patch.keys as [string, string]
        if (prop !== 'childIds') return
        if (SchemaHelper.isPageById(id)) changed = true
        if (this.nodeExpandedMap.get(id)) changed = true
      })
      if (changed) this.nodeInfoChanged.dispatch()
      changed = false
    })
  }
}

export const EditorLPLayerNodeState = autoBind(
  makeObservable(new EditorLPLayerNodeStateService()),
)
