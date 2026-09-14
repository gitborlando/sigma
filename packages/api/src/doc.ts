import { Service } from '@gitborlando/di-service'

export abstract class DocAPI extends Service {
  abstract fetch(id: string): Promise<any>
  abstract store(id: string, data: any): Promise<void>
}
