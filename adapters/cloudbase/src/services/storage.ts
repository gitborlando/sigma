import { StorageAPI, type FileBody } from '@sigma/api'
import autoBind from 'auto-bind'
import { cloudbase } from '../cloudbase'

export class CloudBaseStorageAPI extends StorageAPI {
  constructor() {
    super()
    autoBind(this)
  }

  private storage = cloudbase.storage

  get fileAssets() {
    return this.storage.from('file-assets').throwOnError()
  }

  getUrl(key: string) {
    const { data } = this.fileAssets.getPublicUrl(key)
    return data.publicUrl
  }

  async upload(key: string, file: FileBody) {
    const { data, error } = await this.fileAssets.upload(key, file)
    if (error) throw error
    return data
  }
}
