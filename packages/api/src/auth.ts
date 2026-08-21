import { Service } from '@gitborlando/di-service'
import { z } from 'zod'

export const authSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().url().optional(),
  }),
  signInWithOAuth: z.object({ provider: z.string() }),
})

export type AuthSchema = z.infer<typeof authSchema>

export abstract class AuthAPI extends Service {
  abstract getUser(): Promise<AuthSchema['user'] | null>
  abstract signUpWithPassword(
    email: string,
    password: string,
  ): Promise<string | null>
  abstract signInWithPassword(email: string, password: string): Promise<void>
  abstract signInWithOAuth(req: AuthSchema['signInWithOAuth']): Promise<void>
  abstract signOut(): Promise<void>
}
