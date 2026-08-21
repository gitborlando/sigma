import { useGlobalServices } from 'src/view/hooks/use-services'

export const UploaderComp: FC<{}> = ({}) => {
  const { uploader } = useGlobalServices()
  return (
    <input
      ref={uploader.setInputRef}
      id='uploader'
      type='file'
      style={{ display: 'none' }}
    />
  )
}
