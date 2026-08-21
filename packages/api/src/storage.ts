import { Service } from '@gitborlando/di-service'
import { z } from 'zod'

export type FileBody =
  | File
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | FormData
  | ReadableStream<Uint8Array>
  | string

export const storageSchema = z.object({
  object: z.object({
    id: z.string().min(1),
    path: z.string().min(1),
    fullPath: z.string().min(1), // bucketId/objectName
  }),
})

export type StorageSchema = z.infer<typeof storageSchema>

export abstract class StorageAPI extends Service {
  abstract getUrl(filePath: string): string
  abstract upload(filePath: string, file: FileBody): Promise<StorageSchema['object']>
}
