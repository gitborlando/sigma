import { Service } from '@gitborlando/di-service'

export type FileAcceptType = 'image/*' | (string & {})

type OpenFileOptions = { accept: FileAcceptType; multiple?: boolean }

type ReadAsMap = { Text: string; DataURL: string; ArrayBuffer: ArrayBuffer }

export class Uploader extends Service {
  private inputRef!: HTMLInputElement

  files: File[] = []

  constructor() {
    super()
    autoBind(this)
  }

  setInputRef(input: HTMLInputElement) {
    if (this.inputRef) return
    this.inputRef = input
  }

  async open({ accept, multiple }: OpenFileOptions) {
    this.inputRef.accept = accept
    this.inputRef.multiple = !!multiple
    this.inputRef.click()
    return await new Promise<File[]>((resolve) => {
      this.inputRef.onchange = () => {
        this.files = Array.from(this.inputRef.files || [])
        resolve(this.files)
      }
    })
  }

  readAs<T extends keyof ReadAsMap>(file: File, as: T): Promise<ReadAsMap[T]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as ReadAsMap[T])
      reader.onerror = (e) => reject(e.target?.error)
      if (as === 'Text') reader.readAsText(file)
      else if (as === 'DataURL') reader.readAsDataURL(file)
      else if (as === 'ArrayBuffer') reader.readAsArrayBuffer(file)
    })
  }

  download(name: string, file: File): void {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
}
