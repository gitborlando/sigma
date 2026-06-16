import {
  getAllSelectIdMap,
  getSelectIdList,
  getSelectIdMap,
  getSelectPageId,
} from 'src/editor/utils/get'

export function useSelectIds() {
  return getSelectIdList()
}

export function useSelectIdMap() {
  return getSelectIdMap()
}

export function useAllSelectIdMap() {
  return getAllSelectIdMap()
}

export function useSelectPageId() {
  return getSelectPageId()
}
