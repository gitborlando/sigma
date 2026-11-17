import { FileAPI } from '@sigma/api'
import autoBind from 'auto-bind'
import { supabase } from '../client'
import type { Database } from '../database'

export class SupabaseFileAPI extends FileAPI {
  constructor() {
    super()
    autoBind(this)
  }

  async getFile(id: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return this.transformFile(data)
  }

  async listFiles() {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data.map(this.transformFile)
  }

  async createFile() {
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!auth.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('files')
      .insert({ owner: auth.user.id })
      .select('*')
      .single()
    if (error) throw error
    return this.transformFile(data)
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

  private transformFile({
    created_at,
    ...file
  }: Database['public']['Tables']['files']['Row']) {
    return { ...file, createAt: created_at }
  }
}
