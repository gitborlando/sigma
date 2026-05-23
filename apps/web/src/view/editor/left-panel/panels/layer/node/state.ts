import autobind from 'class-autobind-decorator'
import { SchemaHelper } from 'src/editor/schema/helper'

export type EditorLPLayerNodeInfo = {
  id: string
  indent: number
  ancestors: string[]
}

@autobind
class EditorLPLayerNodeStateService {
  nodeInfoChanged = Signal.create()

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
    SchemaHelper.createCurrentPageTraverse({
      callback: ({ id }) => void this.nodeExpandedMap.set(id, expanded),
    })()
  }

  getNodeInfoList() {
    const nodeInfoList: EditorLPLayerNodeInfo[] = []
    SchemaHelper.createCurrentPageTraverse({
      callback: ({ id, ancestors }) => {
        nodeInfoList.push({ id, indent: ancestors.length, ancestors })
        return !!this.nodeExpandedMap.get(id)
      },
    })()
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

export const EditorLPLayerNodeState = makeObservable(
  new EditorLPLayerNodeStateService(),
)
