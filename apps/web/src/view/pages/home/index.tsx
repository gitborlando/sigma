import { useServiceState } from 'src/view/hooks/feature/use-service-state'
import { HomeFilesComp } from 'src/view/pages/home/files'
import { HomeHeaderComp } from 'src/view/pages/home/header'
import { invalidateQuery, QUERY_KEY } from 'src/view/query'
import { HomeState, HomeStateContext } from 'src/view/states/home'

export const HomeComp: FC<{}> = observer(({}) => {
  const state = useServiceState(HomeState)
  return (
    <HomeStateContext.Provider value={state}>
      <G vertical='auto 1fr'>
        <HomeHeaderComp />
        <HomeFilesComp />
      </G>
    </HomeStateContext.Provider>
  )
})

export function invalidateAuthState() {
  invalidateQuery([QUERY_KEY.getUser])
  invalidateQuery([QUERY_KEY.listFiles])
}
