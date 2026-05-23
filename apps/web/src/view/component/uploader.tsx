import { Uploader } from 'src/global/upload'

type IUploaderComp = {}

export const UploaderComp: FC<IUploaderComp> = ({}) => {
  return (
    <input
      ref={Uploader.setInputRef}
      id='uploader'
      type='file'
      style={{ display: 'none' }}></input>
  )
}
