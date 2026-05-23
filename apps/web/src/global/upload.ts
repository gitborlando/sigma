import autobind from 'class-autobind-decorator'

export type IUploadFileAcceptType = 'image/*' | (string & {})

@autobind
class UploaderService {
  private inputRef!: HTMLInputElement

  setInputRef(input: HTMLInputElement) {
    if (this.inputRef) return
    this.inputRef = input
  }

  async open({ accept }: { accept: IUploadFileAcceptType }) {
    this.inputRef.accept = accept
    this.inputRef.click()
    const file = await new Promise<File | undefined>((resolve) => {
      this.inputRef.onchange = () => resolve(this.inputRef.files?.[0])
    })
    return file
  }

  download(blob: Blob): void {
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = '文件' + new Date().getTime()
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result || '') as string)
      reader.onerror = (e) => reject(e.target?.error)
      reader.readAsText(file)
    })
  }

  readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve((e.target?.result || '') as string)
      reader.onerror = (e) => reject(e.target?.error)
      reader.readAsDataURL(file)
    })
  }
}

export const Uploader = new UploaderService()
