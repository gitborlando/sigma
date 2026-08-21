import { nanoid } from 'nanoid'
import { useGlobalServices } from 'src/view/hooks/use-services'

export function useUpload() {
  const { uploader, objectMgr, storageAPI } = useGlobalServices()

  const handleUploadObject = async () => {
    await uploader.open({ accept: 'image/*', multiple: false })
    const file = uploader.files[0]
    if (!file) return

    const fileId = nanoid(16)
    objectMgr.addObject('file', fileId, file)

    return await storageAPI.upload(fileId, file)
  }

  return handleUploadObject
}
