import autobind from 'class-autobind-decorator'
import { fileTypeFromBuffer } from 'file-type'
import { StageScene } from 'src/editor/render/scene'
import { StageSurface } from 'src/editor/render/surface'
import { StageSelect } from 'src/editor/stage/interact/select'
import { Uploader } from 'src/global/upload'
import { IClientXY, preventDefault } from 'src/shared/utils/event'
import { ImgManager } from '../editor/img-manager'
import { OperateNode } from '../operate/node'
import { OperatePage } from '../operate/page'
import { SvgParser } from '../parse/svg'
import { SchemaCreator } from '../schema/creator'
import { Schema } from '../schema/schema'
import { INodeParent } from '../schema/type'
import { StageViewport } from './viewport'

@autobind
export class StageDropService {
  private sceneXY = XY._(0, 0)
  private containerNode!: V1.NodeParent
  private node!: V1.Node

  initHook() {
    StageSurface.addEvent('dragover', preventDefault())
    StageSurface.addEvent('drop', preventDefault(this.onDrop))
  }

  private async onDrop(e: DragEvent) {
    this.sceneXY = StageViewport.toSceneXY(XY.of(e).xy)
    this.getContainerNode(e)
    await this.handleDrop(e)
    StageSelect.onCreateSelect(this.node.id)
    Schema.finalOperation('drop 导入文件')
  }

  private async handleDrop(e: DragEvent) {
    const dataTransfer = e.dataTransfer
    if (!dataTransfer) return

    endDrop: for (const type of dataTransfer.types) {
      switch (type) {
        case 'Files':
          await this.onDropFiles(e, [...dataTransfer.files])
          break endDrop
        case 'text/plain':
          console.log('text/plain\n', dataTransfer.getData('text/plain'))
          break
        case 'editor-drop/svg':
          console.log('editor-drop/svg\n', dataTransfer.getData('editor-drop/svg'))
          break
      }
    }
  }

  private async onEditorDrop(e: DragEvent, dropData: string) {
    const { event, data } = JSON.parse(dropData)
    switch (event) {
      case 'dropSvg':
        this.dropSvg(data.svgStr, data.name)
        break

      case 'dropImage':
        await this.dropImage(data.url)
        break
    }
  }

  private async onDropUrl(url: string) {
    // const ossUrl = await api.upload.uploadControllerUploadByUrl({ url })
    // await this.dropImage(ossUrl)
    await this.dropImage(url)
  }

  private async onDropFiles(e: DragEvent, files: File[]) {
    for (const file of files) {
      await this.onDropFile(e, file)
    }
  }

  private async onDropFile(e: DragEvent, file: File) {
    const typeBuffer = await file.slice(0, 410).arrayBuffer()
    const fileType = await fileTypeFromBuffer(typeBuffer)

    switch (fileType?.mime || file.type) {
      case 'image/svg+xml':
        const svg = await Uploader.readAsText(file)
        this.dropSvg(svg, file.name)
        break

      case 'image/jpeg':
      case 'image/png':
      case 'image/jpg':
      case 'image/gif':
      case 'image/webp':
      // const { signedUploadUrl, url } = await api.upload.uploadControllerGetSignedUrl({
      //   ext: fileType!.ext,
      // })
      // await axios.put(signedUploadUrl, file, {
      //   onUploadProgress: (progress) => {
      //     console.log('progress: ', progress)
      //   },
      //   headers: {
      //     'Content-Type': fileType!.mime,
      //     'Cache-Control': 'immutable',
      //   },
      // })
      // await this.dropImage(url)
      // break
    }
  }

  private dropSvg(svgString: string, name: string) {
    this.node = new SvgParser(svgString, this.sceneXY).parse()
    this.node.name = name
    OperateNode.insertAt(this.containerNode, this.node)
  }

  private async dropImage(url: string) {
    const image = await ImgManager.getImageAsync(url)
    const option = { ...this.sceneXY, width: image.width, height: image.height }
    this.node = SchemaCreator.rect(option)
    this.node.fills = [SchemaCreator.fillImage(url)]
    OperateNode.addNodes([this.node])
    OperateNode.insertAt(this.containerNode, this.node)
  }

  private getContainerNode(e: IClientXY) {
    const hoverIds = StageScene.elemsFromPoint(e).map((elem) => elem.id)

    this.containerNode =
      hoverIds
        .map(Schema.find<INodeParent>)
        .find((node) => node?.type === 'frame') || OperatePage.currentPage
  }
}

export const StageDrop = new StageDropService()
