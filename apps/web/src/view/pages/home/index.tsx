import { HomeFilesComp } from 'src/view/pages/home/files'
import { HomeHeaderComp } from 'src/view/pages/home/header'

export const HomeComp: FC<{}> = observer(({}) => {
  return (
    <G vertical='auto 1fr'>
      <HomeHeaderComp />
      <HomeFilesComp />
    </G>
  )
})
