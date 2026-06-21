import { LRU } from 'tiny-lru'

export type IImage = {
  objectUrl: string
  arrayBuffer: ArrayBuffer
  width: number
  height: number
  image: HTMLImageElement
}

class ImageService {
  private imageCache = new LRU<IImage>(300)

  getImage(url: string) {
    return this.imageCache.get(url)
  }

  async getImageAsync(url: string) {
    const image = this.getImage(url)
    if (image) return await image
    const loadedImage = await this.loadImage(url)
    this.imageCache.set(url, loadedImage)
    return loadedImage
  }

  private async loadImage(url: string) {
    const image = <IImage>{}
    const htmlImage = new globalThis.Image()
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

export const Image = autoBind(new ImageService())
