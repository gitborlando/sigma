import { APIImplements } from '@sigma/api'
import { CloudBaseAuthAPI } from './services/auth'
import { CloudBaseFileAPI } from './services/file'
import { CloudBaseStorageAPI } from './services/storage'

export const cloudBaseServices: APIImplements = {
  authAPI: CloudBaseAuthAPI,
  storageAPI: CloudBaseStorageAPI,
  fileAPI: CloudBaseFileAPI,
}
