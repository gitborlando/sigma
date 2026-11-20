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
  abstract createFile(id: string, content: Uint8Array): Promise<void>
  abstract deleteFile(id: string): Promise<void>
  abstract getContent(id: string): Promise<{ content: Uint8Array; revision: number }>
  abstract getRevision(id: string): Promise<number>
  abstract saveContent(
    id: string,
    content: Uint8Array,
    revision: number,
    keepalive?: boolean,
  ): Promise<boolean>
}
