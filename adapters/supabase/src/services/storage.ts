import { StorageAPI, type FileBody } from '@sigma/api'
import autoBind from 'auto-bind'
import { supabase } from '../client'

export class SupabaseStorageAPI extends StorageAPI {
  constructor() {
    super()
    autoBind(this)
  }

  getUrl(key: string) {
    return supabase.storage.from('file-assets').getPublicUrl(key).data.publicUrl
  }

  async upload(key: string, file: FileBody) {
    const { data, error } = await supabase.storage
      .from('file-assets')
      .upload(key, file)
    if (error) throw error
    return data
  }
}
