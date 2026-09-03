import { withSuspense } from '@gitborlando/utils/react'
import { FileSchema } from '@sigma/api'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import Scrollbars from 'react-custom-scrollbars-2'
import { Loading } from 'src/view/component/loading'
import { Text } from 'src/view/component/text'
import { useContextMenu } from 'src/view/features/context-menu'
import { useGlobalServices } from 'src/view/hooks/use-services'
import { QUERY_KEY } from 'src/view/query'

export const HomeFilesComp = withSuspense(
  observer(() => {
    const { fileAPI } = useGlobalServices()
    const { data } = useSuspenseQuery({
      queryKey: [QUERY_KEY.listFiles],
      queryFn: () => fileAPI.listFiles(),
    })

    return (
      <G style={{ minHeight: 0, minWidth: 0, overflow: 'auto' }}>
        <Scrollbars>
          <G className={cls()} horizontal='repeat(auto-fill, 320px)' gap={24}>
            {data?.map((file) => (
              <FileItemComp key={file.id} file={file} />
            ))}
          </G>
        </Scrollbars>
      </G>
    )
  }),
  <Loading />,
)

const FileItemComp: FC<{ file: FileSchema['file'] }> = ({ file }) => {
  const query = useQueryClient()
  const contextMenu = useContextMenu()
  const { fileAPI } = useGlobalServices()

  const navigate = useNavigate()
  const handleClick = () => navigate(`/fileId/${file.id}`)

  const handleContextMenu = (e: React.MouseEvent) => {
    contextMenu.menus = [
      [
        {
          name: t('delete'),
          callback: async () => {
            await fileAPI.deleteFile(file.id)
            query.invalidateQueries({ queryKey: [QUERY_KEY.listFiles] })
          },
        },
      ],
    ]
    contextMenu.open(e)
  }

  return (
    <G
      className={cls('item')}
      onClick={() => handleClick()}
      onContextMenu={handleContextMenu}>
      <G className={cls('item-cover')}>
        <img
          draggable={false}
          src={
            'https://p1-arco.byteimg.com/tos-cn-i-uwbnlip3yd/3ee5f13fb09879ecb5185e440cef6eb9.png~tplv-uwbnlip3yd-webp.webp'
          }
          alt={file.name || t('untitled')}
        />
      </G>
      <G className={cls('item-meta')}>
        <Text variant='head' className='text-[14px]'>
          {decodeURIComponent(file.name || t('untitled'))}
        </Text>
        <Text variant='common'>{dayjs(file.createAt).format('YYYY/MM/DD')}</Text>
      </G>
    </G>
  )
}

const cls = classes(css`
  padding: 20px;
  gap: 20px;
  &-item {
    width: 300px;
    height: 240px;
    ${styles.borderRadiusSM}
    cursor: pointer;
    background: var(--bg-content);
    &:hover {
      outline: 2px solid var(--color);
      outline-offset: 1px;
    }
    &:hover &-meta-action {
      display: flex;
    }
    &-cover {
      width: 100%;
      height: 180px;
      object-fit: cover;
      ${styles.borderRadiusSM}
      overflow: hidden;
    }
  }
`)
