import {
  getAllSelectIdMap,
  getSelectIdList,
  getSelectIdMap,
  getSelectPageId,
} from 'src/editor/utils/get'
import { useEditor } from 'src/view/hooks/editor'

export function useSelectIds() {
  return getSelectIdList(useEditor())
}

export function useSelectIdMap() {
  return getSelectIdMap(useEditor())
}

export function useAllSelectIdMap() {
  return getAllSelectIdMap(useEditor())
}

export function useSelectPageId() {
  return getSelectPageId(useEditor())
}
