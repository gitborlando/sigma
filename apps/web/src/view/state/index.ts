import { ServiceContainer, ServiceInstances } from '@gitborlando/di-service'
import { ViewStateFiles } from 'src/view/state/home/files'

const viewStateServices = { viewStateFiles: ViewStateFiles }

export type ViewStateServices = ServiceInstances<typeof viewStateServices>
export type ViewStateServiceId = keyof ViewStateServices

export class ViewState extends ServiceContainer<typeof viewStateServices> {
  protected static instance: ViewState

  constructor() {
    super(viewStateServices)
  }

  static getInstance() {
    if (this.instance) return this.instance
    return (this.instance = new this())
  }
}
