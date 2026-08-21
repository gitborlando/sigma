import { FileAPI, FileSchema } from '@sigma/api'
import autoBind from 'auto-bind'
import { omit } from 'es-toolkit'
import { cloudbase, type PublicSchema } from '../cloudbase'

export class CloudBaseFileAPI extends FileAPI {
  constructor() {
    super()
    autoBind(this)
  }

  private from = <Name extends keyof PublicSchema['Tables']>(name: Name) =>
    cloudbase.rdb().from<PublicSchema, Name, PublicSchema['Tables'][Name]>(name)

  async getFile(id: string): Promise<FileSchema['file']> {
    const { data, error } = await this.from('files')
      .select('*')
      .eq('id', id)
      .limit(1)
    if (error) throw error
    if (!data || data.length === 0) throw new Error('File not found')
    return this.transformFile(data[0])
  }

  async listFiles(): Promise<FileSchema['file'][]> {
    const { data, error } = await this.from('files').select('*').limit(30)

    if (error) throw new Error(error.message)
    if (!data) return []
    return data.map((item) => this.transformFile(item))
  }

  async createFile(option: { userId: string }) {
    const { userId } = option
    const { data, error } = await this.from('files')
      .insert({ owner: userId })
      .select()

    if (error || !data || data.length === 0) throw new Error('File not created')
    return this.transformFile(data[0])
  }

  async deleteFile(id: string): Promise<void> {
    const { error } = await this.from('files').delete().eq('id', id)
    if (error) throw error
  }

  private transformFile(
    file: PublicSchema['Tables']['files']['Row'],
  ): FileSchema['file'] {
    return { ...omit(file, ['created_at']), createAt: file.created_at }
  }
}
