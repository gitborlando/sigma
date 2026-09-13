import { Service } from '@gitborlando/di-service'

export function useServiceState<T extends Service>(service: new () => T) {
  const [state] = useState(() => new service())
  useEffect(() => () => state.dispose(), [])
  return state
}
