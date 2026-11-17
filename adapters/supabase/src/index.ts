import type { APIImplements } from '@sigma/api'
import { SupabaseAuthAPI } from './services/auth'
import { SupabaseFileAPI } from './services/file'
import { SupabaseStorageAPI } from './services/storage'

export const supabaseServices = {
  authAPI: SupabaseAuthAPI,
  storageAPI: SupabaseStorageAPI,
  fileAPI: SupabaseFileAPI,
} satisfies APIImplements
