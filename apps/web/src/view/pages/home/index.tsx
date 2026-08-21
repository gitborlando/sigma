import { HomeFilesComp } from 'src/view/pages/home/private/files'
import { HomeHeaderComp } from 'src/view/pages/home/private/header'

export const HomeComp: FC<{}> = observer(({}) => {
  return (
    <G vertical='auto 1fr'>
      <HomeHeaderComp />
      <HomeFilesComp />
    </G>
  )
})
