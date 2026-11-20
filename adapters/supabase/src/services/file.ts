import { FileAPI } from '@sigma/api'
import autoBind from 'auto-bind'
import { anonKey, supabase, url } from '../client'
import type { Database } from '../database'

export class SupabaseFileAPI extends FileAPI {
  constructor() {
    super()
    autoBind(this)
  }

  async getFile(id: string) {
    const { data, error } = await supabase
      .from('files')
      .select('id, created_at, name, owner')
      .eq('id', id)
      .single()
    if (error) throw error
    return this.transformFile(data)
  }

  async listFiles() {
    const { data, error } = await supabase
      .from('files')
      .select('id, created_at, name, owner')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data.map(this.transformFile)
  }

  async createFile(id: string, content: Uint8Array) {
    const response = await this.requestContent(id, 'POST', content)
    if (!response.ok) throw new Error(`Failed to create file (${response.status})`)
  }

  async deleteFile(id: string) {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id)
      .select('id')
      .single()
    if (error) throw error
  }

  async getContent(id: string) {
    const response = await this.requestContent(id, 'GET')
    if (!response.ok) throw new Error(`Failed to read file (${response.status})`)

    const revision = Number(response.headers.get('x-file-revision'))
    if (!Number.isSafeInteger(revision) || revision < 1)
      throw new Error('Invalid file revision')

    return { content: new Uint8Array(await response.arrayBuffer()), revision }
  }

  async getRevision(id: string) {
    const { data, error } = await supabase
      .from('files')
      .select('revision')
      .eq('id', id)
      .single()
    if (error) throw error
    return data.revision
  }

  async saveContent(
    id: string,
    content: Uint8Array,
    revision: number,
    keepalive = false,
  ) {
    const response = await this.requestContent(
      id,
      'PUT',
      content,
      revision,
      keepalive,
    )
    if (response.status === 409) return false
    if (!response.ok) throw new Error(`Failed to save file (${response.status})`)
    return true
  }

  private async requestContent(
    id: string,
    method: 'GET' | 'POST' | 'PUT',
    content?: Uint8Array,
    revision?: number,
    keepalive = false,
  ) {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('User not authenticated')

    const params = new URLSearchParams({ id })
    if (revision !== undefined) params.set('revision', String(revision))

    return fetch(`${url}/functions/v1/file-content?${params}`, {
      method,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: anonKey!,
        'Content-Type': 'application/octet-stream',
      },
      body: content ? new Blob([content as BlobPart]) : undefined,
      keepalive,
    })
  }

  private transformFile({
    created_at,
    ...file
  }: Pick<
    Database['public']['Tables']['files']['Row'],
    'id' | 'created_at' | 'name' | 'owner'
  >) {
    return { ...file, createAt: created_at }
  }
}
