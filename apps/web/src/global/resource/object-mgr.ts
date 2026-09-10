import { Service } from '@gitborlando/di-service'

type Domain = 'image' | 'file'
type LocalObject = { domain: string; id: string; objectUrl: string; file: File }

export class ObjectMgr extends Service {
  private objectCache = new Map<string, LocalObject>()

  constructor() {
    super()
    autoBind(this)
    this.effect(() => {
      this.objectCache.forEach((object) => {
        URL.revokeObjectURL(object.objectUrl)
        this.objectCache.delete(`${object.domain}/${object.id}`)
      })
    })
  }

  getObject(domain: Domain, id: string) {
    const key = `${domain}/${id}`
    const object = this.objectCache.get(key)
    return object
  }

  addObject(domain: Domain, id: string, file: File) {
    const key = `${domain}/${id}`
    const objectUrl = URL.createObjectURL(file)
    const localObject: LocalObject = { domain, id, objectUrl, file }
    this.objectCache.set(key, localObject)
  }

  removeObject(domain: Domain, id: string) {
    const key = `${domain}/${id}`
    const object = this.objectCache.get(key)
    if (object) {
      URL.revokeObjectURL(object.objectUrl)
      this.objectCache.delete(key)
    }
  }
}
