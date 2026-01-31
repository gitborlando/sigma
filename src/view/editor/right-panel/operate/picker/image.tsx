import { iife } from '@gitborlando/utils'
import { ImgManager } from 'src/editor/editor/img-manager'
import { Uploader } from 'src/global/upload'
import { suspense } from 'src/view/component/suspense'
import { suspend } from 'suspend-react'

export const PickerImageComp: FC<{ fill: S.FillImage }> = memo(({ fill }) => {
  const uploadImage = async () => {
    const file = await Uploader.open({ accept: 'image/*' })
    const url = await ImgManager.uploadLocal(file!)
  }

  return (
    <G vertical center className={cls()}>
      <G center className={cls('content')}>
        <G center className={cls('mask')}>
          <G center className={cls('mask-change')} onClick={uploadImage}>
            更换图片
          </G>
        </G>
        <ImgComp url={fill.url} />
      </G>
    </G>
  )
})

const ImgComp: FC<{ url: string }> = suspense(({ url }) => {
  const image = suspend(() => ImgManager.getImageAsync(url), [url])
  const imageBound = iife(() => {
    const { width, height } = image
    const rate = width / height
    return rate > 1
      ? { width: 216, height: 216 / rate }
      : { width: 184 * rate, height: 184 }
  })
  return <img src={image.objectUrl} style={{ ...imageBound }}></img>
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
