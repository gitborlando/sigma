import { AuthAPI, type AuthSchema } from '@sigma/api'
import { AuthSessionMissingError, type User } from '@supabase/supabase-js'
import autoBind from 'auto-bind'
import { supabase } from '../client'

export class SupabaseAuthAPI extends AuthAPI {
  private user: AuthSchema['user'] | null = null

  constructor() {
    super()
    autoBind(this)

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      this.user = session ? this.transformUser(session.user) : null
    })
    this.effect(() => data.subscription.unsubscribe())
  }

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error instanceof AuthSessionMissingError) return (this.user = null)
    if (error) throw error
    return (this.user = data.user ? this.transformUser(data.user) : null)
  }

  getExistedUser() {
    if (!this.user) throw new Error('User not authenticated')
    return this.user
  }

  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data.user?.id ?? null
  }

  async signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async signInWithOAuth({ provider }: AuthSchema['signInWithOAuth']) {
    if (provider !== 'google')
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    this.user = null
  }

  private transformUser(user: User): AuthSchema['user'] {
    const name = user.user_metadata.full_name ?? user.user_metadata.name
    const avatar = user.user_metadata.avatar_url ?? user.user_metadata.picture
    return {
      id: user.id,
      name: typeof name === 'string' ? name : (user.email ?? 'User'),
      avatar: typeof avatar === 'string' ? avatar : undefined,
    }
  }
}
