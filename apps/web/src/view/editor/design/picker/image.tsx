import { useUpload } from 'src/view/hooks/feature/use-upload'
import { useEditorServices, useGlobalServices } from 'src/view/hooks/use-services'

export const PickerImageComp: FC<{ fill: S.FillImage; index: number }> = observer(
  ({ fill, index }) => {
    const { designFill } = useEditorServices()
    const handleUpload = useUpload()

    const uploadImage = async () => {
      const res = await handleUpload()
      if (res) {
        console.log('res: ', res)
        designFill.setFill<S.FillImage>(index, (fill) => {
          fill.url = res.path
        })
      }
    }

    return (
      <G vertical center className={cls()}>
        <G center className={cls('content')}>
          <G center className={cls('mask')}>
            <G center className={cls('mask-change')} onClick={uploadImage}>
              更换图片
            </G>
          </G>
          <ImgComp id={fill.url} />
        </G>
      </G>
    )
  },
)

const ImgComp: FC<{ id: string }> = observer(({ id }) => {
  const { storageAPI } = useGlobalServices()
  const url = !!id ? storageAPI.getUrl(id) : Assets.editor.design.fill.defaultImage
  return (
    <img src={url} style={{ width: 216, height: 184, objectFit: 'contain' }}></img>
  )
})

const cls = classes(css`
  &:hover &-mask {
    display: grid;
  }
  &-content {
    width: 216px;
    height: 184px;
    overflow: hidden;
    border: 1px solid var(--gray-border);
    ${styles.borderRadius}
  }
  &-mask {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.4);
    display: none;
    &-change {
      width: 80px;
      height: 32px;
      border-radius: 5px;
      border: 1px solid white;
      color: white;
      ${styles.textLabel}
      cursor: pointer;
    }
  }
`)
