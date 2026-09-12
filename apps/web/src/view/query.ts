import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

export function invalidateQuery(key: QUERY_KEY[keyof QUERY_KEY]) {
  queryClient.invalidateQueries({ queryKey: [key] })
}

export enum QUERY_KEY {
  listFiles = 'listFiles',

  getUser = 'getUser',
}
