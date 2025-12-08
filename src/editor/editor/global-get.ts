import { HandleNode } from 'src/editor/handle/node'
import { getSelectIdList } from 'src/editor/y-state/y-clients'

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<V1.Node>(id))
}

export function getNodeMRect(node: V1.Node) {
  return HandleNode.getMRect(node)
}
