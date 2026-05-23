import { Flex } from '@gitborlando/widget'
import { createClient, Photo } from 'pexels'
import Scrollbars from 'react-custom-scrollbars-2'
import { InView } from 'react-intersection-observer'
import { Loading } from 'src/view/component/loading'

const pexels = createClient(
  '1vbcKedpSbDaktXlI6jmDczCNUBMqDkXL3Gndwp7HMblwGoENO4xlDnm',
)

interface EditorLeftPanelImagesProps {}

export const EditorLeftPanelImages: FC<EditorLeftPanelImagesProps> = ({}) => {
  const [lists] = useState({
    left: [] as Photo[],
    right: [] as Photo[],
    leftHeight: 0,
    rightHeight: 0,
  })
  const [page, setPage] = useState(1)

  const load = async () => {
    const response = await pexels.photos.curated({ page: page, per_page: 12 })
    if ('error' in response) return
    response.photos.forEach((photo) => {
      const displayHeight = (photo.height / photo.width) * 118
      photo.width = 118
      photo.height = displayHeight
      if (lists.leftHeight < lists.rightHeight) {
        lists.leftHeight += displayHeight
        lists.left.push(photo)
      } else {
        lists.rightHeight += displayHeight
        lists.right.push(photo)
      }
    })
    setPage(page + 1)
  }

  return (
    <G>
      <Scrollbars>
        <G className='h-fit' gap={4} horizontal='auto auto'>
          <Flex className='lay-v'>
            {lists.left.map((photo, i) => (
              <PhotoComp key={photo.id} photo={photo} />
            ))}
          </Flex>
          <Flex className='lay-v'>
            {lists.right.map((photo, i) => (
              <PhotoComp key={photo.id} photo={photo} />
            ))}
          </Flex>
        </G>
        <Flex className='lay-c wh-100%-40 shrink-0'>
          <InView
            as={'div'}
            className='wh-fit-fit'
            onChange={(inView) => inView && load()}>
            <Loading size={20} />
          </InView>
        </Flex>
      </Scrollbars>
    </G>
  )
}

const PhotoComp: FC<{ photo: Photo }> = ({ photo }) => {
  const photoUrl = photo.src.large
  // const applyImageFill = async () => {
  //   loadingWebImageUrl.dispatch(photoUrl)
  //   await ImgManager.getImageAsync(photoUrl)
  //   loadingWebImageUrl.dispatch('')
  //   if (type.value !== 'image') type.dispatch('image')
  //   setFillUrl(photoUrl)
  // }
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ event: 'dropImage', data: { url: photoUrl } }),
    )
  }
  // useHookSignal(loadingWebImageUrl)

  return (
    <G
      draggable
      className='lay-c mb-4'
      onDragStart={onDragStart}
      style={{ width: photo.width, height: photo.height }}>
      <img className='wh-100%' src={photo.src.medium} onClick={() => {}}></img>
      {/* {loadingWebImageUrl.value === photoUrl && (
        <Flex className='lay-c wh-100% bg-[rgba(0,0,0,0.5)] absolute'>
          <Icon className='wh-20 absolute' url={Assets.editor.shared.loading} />
        </Flex>
      )} */}
    </G>
  )
}
