import { HandleSelect } from 'src/editor/handle/select'
import { getAllSelectIdMap } from 'src/editor/utils/get'

export function useSelectIds() {
  return HandleSelect.selectIdList
}

export function useSelectIdMap() {
  return HandleSelect.state.selectIdMap
}

export function useAllSelectIdMap() {
  return getAllSelectIdMap()
}

export function useSelectPageId() {
  return HandleSelect.selectPageId
}
