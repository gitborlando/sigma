import { Database } from '@hocuspocus/extension-database'
import { Server } from '@hocuspocus/server'

const server = new Server({
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {},
      store: async ({ documentName, state }) => {},
    }),
  ],
})
