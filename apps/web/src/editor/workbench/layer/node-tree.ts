import { makeObservable } from 'mobx'
import { findGraph } from 'src/editor/doc/finder'
import { DocHelper } from 'src/editor/doc/helper'
import { createGraphTraverse } from 'src/editor/doc/traverse'
import { Select } from 'src/editor/select'
import { YDocPatch } from 'src/editor/y-adapter/y-doc'
import { Service } from '@gitborlando/di-service'

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

  constructor(private readonly select: Select) {
    super()
    autoBind(makeObservable(this))
  }

  getNodeExpanded(id: string) {
    return this.expandedNodeMap.get(id)
  }

  toggleNodeExpanded(id: string, expanded: boolean) {
    this.expandedNodeMap.set(id, expanded)
  }

  toggleAllNodeExpanded(expanded: boolean) {
    const traverse = createGraphTraverse({
      enter: ({ graph }) => {
        if (!DocHelper.isParent(graph)) return
        this.expandedNodeMap.set(graph.id, expanded)
      },
    })
    traverse(this.select.getSelectedPage().childIds)
  }

  onYDocPatch(patches: YDocPatch[]) {
    patches.forEach((patch) => {
      if (patch.keys[2] !== 'childIds') return

      const id = patch.keys[1] as ID

      if (DocHelper.isPageById(id)) this.nodeInfoVersion++
      if (this.expandedNodeMap.get(id)) this.nodeInfoVersion++
      if (DocHelper.isNode(findGraph(id), 'frame') && patch.type === 'add')
        this.expandedNodeMap.set(id, true)
    })
  }

  private getNodeInfoList() {
    const nodeInfoList: LayerNodeTreeInfo[] = []
    const traverse = createGraphTraverse({
      enter: ({ graph, ancestors }) => {
        const ancestorIds = ancestors.map((node) => node.id)
        nodeInfoList.push({
          id: graph.id,
          indent: ancestorIds.length,
          ancestorIds: ancestorIds,
        })
        return !!this.expandedNodeMap.get(graph.id)
      },
    })
    traverse(this.select.getSelectedPage().childIds)
    return nodeInfoList
  }
}
