import { HandleNode } from 'src/editor/handle/node'
import { getSelectIdList } from '../utils/get'

export const getSelectedNodes = () => {
  return getSelectIdList().map((id) => YState.find<S.Node>(id))
}

export function getNodeMRect(node: S.Node) {
  return HandleNode.getMRect(node)
}
