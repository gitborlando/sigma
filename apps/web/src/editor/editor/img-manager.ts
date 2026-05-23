import { createObjCache } from '@gitborlando/utils'
import autobind from 'class-autobind-decorator'

export type IImage = {
  objectUrl: string
  arrayBuffer: ArrayBuffer
  width: number
  height: number
  image: HTMLImageElement
}

@autobind
class ImgService {
  private imageCache = createObjCache<IImage>()

  getImage(url: string) {
    return this.imageCache.get(url)
  }

  async getImageAsync(url: string) {
    const image = this.getImage(url)
    if (image) return await image
    return this.imageCache.set(url, await this.loadImage(url))
  }

  async uploadLocal(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const base64String = e.target?.result
        resolve(base64String as string)
      }
    })
  }

  private async loadImage(url: string) {
    const image = <IImage>{}
    const htmlImage = new Image()
    htmlImage.crossOrigin = 'anonymous'
    image.objectUrl = url
    await new Promise<void>((resolve) => {
      image.image = htmlImage
      htmlImage.src = image.objectUrl
      htmlImage.onload = () => {
        image.width = htmlImage.width
        image.height = htmlImage.height
        resolve()
      }
    })
    return image
  }
}

export const ImgManager = new ImgService()
