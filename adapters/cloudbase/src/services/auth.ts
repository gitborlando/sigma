import { AuthAPI, AuthSchema } from '@sigma/api'
import autoBind from 'auto-bind'
import { cloudbase } from '../cloudbase'

export class CloudBaseAuthAPI extends AuthAPI {
  constructor() {
    super()
    autoBind(this)
  }

  private auth = cloudbase.auth
  user: AuthSchema['user'] | null = null

  async getUser() {
    const { data, error } = await this.auth.getUser()
    if (error) throw error
    if (!data.user) return null
    return (this.user = {
      id: data.user.id,
      name: data.user.user_metadata.nickName,
      avatar: data.user.user_metadata.avatarUrl,
    })
  }

  async signInWithPassword(email: string, password: string) {
    await this.auth.signInWithPassword({ email, password })
  }

  async signOut() {
    await this.auth.signOut()
  }

  async signUpWithPassword(email: string, password: string) {
    const res = await this.auth.signInWithPassword({ email, password })
    return res.data.user?.id
  }

  async signInWithOAuth(req: AuthSchema['signInWithOAuth']) {
    await this.auth.signInWithOAuth(req)
  }
}
