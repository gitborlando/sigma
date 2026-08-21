import { Service } from '@gitborlando/di-service'
import autoBind from 'auto-bind'
import { LRU } from 'tiny-lru'

/**
 * image runtime
 */
export type ImageRT = { width: number; height: number; image: HTMLImageElement }

export class ImageMgr extends Service {
  private imageCache = new LRU<ImageRT>(300)

  constructor() {
    super()
    autoBind(this)
  }

  getImage(key: string) {
    if (!key) return
    return this.imageCache.get(key)
  }

  async getImageAsync(key: string) {
    const image = this.getImage(key)
    if (image) return await image

    const loadedImage = await this.loadImage(key)
    this.imageCache.set(key, loadedImage)
    return loadedImage
  }

  private async loadImage(key: string) {
    const image = <ImageRT>{}
    const htmlImage = new globalThis.Image()
    await new Promise<void>((resolve) => {
      image.image = htmlImage
      htmlImage.src = key
      htmlImage.onload = () => {
        image.width = htmlImage.width
        image.height = htmlImage.height
        resolve()
      }
      htmlImage.onerror = () => {
        resolve()
      }
    })
    return image
  }
}
