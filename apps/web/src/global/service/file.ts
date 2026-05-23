import axios from 'axios'
import autobind from 'class-autobind-decorator'
import { Database } from 'types/supabase'
import { supabase } from '../sdk/supabase'

@autobind
class FileServiceClass {
  async getFiles() {
    try {
      const { data } = await supabase.from('files').select()
      return data
    } catch (error) {
      console.error(error)
      return []
    }
  }

  async getFileMeta(id: string) {
    // return {
    //   url: 'https://cos.editor.gitborlando.com/files/%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B61.zip',
    //   createdAt: '2025-10-02T17:21:33.287943+00:00',
    //   id: 'b0fc888c-9d03-4bba-b337-d5dddb87ef2a',
    //   name: '测试文件1',
    //   y_schema_id: '84ef9622-cb22-48d6-aad7-bc5db4cab55a',
    // }
    const { data } = await supabase.from('files').select().eq('id', id)
    return data?.[0]
  }

  async addNewFile(file: Database['public']['Tables']['files']['Insert']) {
    return await supabase.from('files').insert(file)
  }

  async loadFile(url: string, onProgress?: (progress: number) => void) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      axios
        .get(url, {
          responseType: 'arraybuffer',
          onDownloadProgress: (e) =>
            onProgress?.(Number((e.loaded / e.bytes).toFixed(2))),
        })
        .then((res) => {
          resolve(res.data)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }
}

export const FileService = new FileServiceClass()
