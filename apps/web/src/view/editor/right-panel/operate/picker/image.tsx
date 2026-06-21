import { iife } from '@gitborlando/utils'
import { withSuspense } from '@gitborlando/utils/react'
import { Image } from 'src/global/service/image'
import { suspend } from 'suspend-react'

export const PickerImageComp: FC<{ fill: S.FillImage }> = memo(({ fill }) => {
  const uploadImage = async () => {
    throw new Error('not implemented yet')
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

const ImgComp = withSuspense<{ url: string }>(({ url }) => {
  const image = suspend(() => Image.getImageAsync(url), [url])
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
