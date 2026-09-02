import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

export enum QUERY_KEY {
  listFiles = 'listFiles',
}
