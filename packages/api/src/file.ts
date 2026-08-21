import { Service } from '@gitborlando/di-service'
import { z } from 'zod'

export const fileSchema = z.object({
  file: z.object({
    id: z.string(),
    name: z.string().nullable(),
    createAt: z.string(),
    owner: z.string(),
  }),
})

export type FileSchema = z.infer<typeof fileSchema>

export abstract class FileAPI extends Service {
  abstract getFile(id: string): Promise<FileSchema['file']>
  abstract listFiles(): Promise<FileSchema['file'][]>
  abstract createFile(option: { userId: string }): Promise<FileSchema['file']>
  abstract deleteFile(id: string): Promise<void>
}
