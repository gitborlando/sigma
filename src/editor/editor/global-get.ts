import { HandleNode } from 'src/editor/handle/node'
import { getSelectIdList } from 'src/editor/y-state/y-clients'

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}

export function getNodeMRect(node: S.Node) {
  return HandleNode.getMRect(node)
}
