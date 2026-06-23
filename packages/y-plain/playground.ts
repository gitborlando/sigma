import * as Y from 'yjs'
import { YPlain } from './src/index'

type DemoState = {
  title: string
  nodes: {
    id: string
    name: string
  }[]
}

const doc = new Y.Doc()
const yMap = doc.getMap('state')
const plain = new YPlain<DemoState>(yMap, {
  title: 'Untitled',
  nodes: [],
})

const disposeObserve = plain.observe()
const disposeSubscribe = plain.subscribe(({ state, patches, origin }) => {
  console.log('origin:', origin)
  console.log('patches:', patches)
  console.log('state:', state)
})

plain.transact(() => {
  plain.set(['title'], 'YPlain playground')
  plain.insert(['nodes'], { id: 'node-1', name: 'Header' })
  plain.replace(['nodes', 0, 'name'], 'Hero')
}, 'playground')

disposeSubscribe()
disposeObserve()
