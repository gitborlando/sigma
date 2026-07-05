import * as Y from 'yjs'
import { joinYPlainPath, YPlain } from './src/index'

type Shape = {
  id: string
  type: 'rect' | 'text'
  name: string
  position: {
    x: number
    y: number
  }
  style: {
    fill: string
    opacity: number
  }
  children: string[]
}

type DemoState = {
  document: {
    title: string
    pageIds: string[]
    activePageId: string
  }
  pages: Record<
    string,
    {
      id: string
      name: string
      shapeIds: string[]
    }
  >
  shapes: Record<string, Shape>
  selection: {
    shapeIds: string[]
    locked: boolean
  }
}

const initialState: DemoState = {
  document: {
    title: 'YPlain playground',
    pageIds: ['page-cover'],
    activePageId: 'page-cover',
  },
  pages: {
    'page-cover': {
      id: 'page-cover',
      name: 'Cover',
      shapeIds: ['shape-title'],
    },
  },
  shapes: {
    'shape-title': {
      id: 'shape-title',
      type: 'text',
      name: 'Title',
      position: { x: 96, y: 80 },
      style: { fill: '#111827', opacity: 1 },
      children: [],
    },
  },
  selection: {
    shapeIds: [],
    locked: false,
  },
}

const logSection = (title: string) => {
  console.log(`\n# ${title}`)
}

const doc = new Y.Doc()
const yMap = doc.getMap('state')
const plain = new YPlain<DemoState>(yMap, initialState)

const disposeObserve = plain.observe()
const disposeSubscribe = plain.subscribe(({ state, patches, origin }) => {
  console.log('\nchange origin:', origin)
  patches.forEach((patch) => {
    const path = joinYPlainPath(patch.keys)

    if (patch.type === 'add') {
      console.log('  add    ', path, patch.value)
      return
    }

    if (patch.type === 'remove') {
      console.log('  remove ', path, patch.oldValue)
      return
    }

    console.log('  replace', path, patch.oldValue, '=>', patch.value)
  })
  console.log('  active page:', state.document.activePageId)
  console.log('  selected:', state.selection.shapeIds.join(', ') || '(none)')
})

logSection('Initial state')
console.log(JSON.stringify(plain.state, null, 2))

logSection('Create a page and two shapes in one business action')
plain.transact('create-wireframe', () => {
  plain.insert(['document', 'pageIds'], 'page-wireframe')
  plain.set(['document', 'activePageId'], 'page-wireframe')
  plain.set(['pages', 'page-wireframe'], {
    id: 'page-wireframe',
    name: 'Wireframe',
    shapeIds: [],
  })
  plain.set(['shapes', 'shape-card'], {
    id: 'shape-card',
    type: 'rect',
    name: 'Card',
    position: { x: 120, y: 140 },
    style: { fill: '#38bdf8', opacity: 0.9 },
    children: [],
  })
  plain.set(['shapes', 'shape-label'], {
    id: 'shape-label',
    type: 'text',
    name: 'Label',
    position: { x: 144, y: 168 },
    style: { fill: '#0f172a', opacity: 1 },
    children: [],
  })
  plain.insert(['pages', 'page-wireframe', 'shapeIds'], 'shape-card')
  plain.insert(['pages', 'page-wireframe', 'shapeIds'], 'shape-label')
  plain.insert(['shapes', 'shape-card', 'children'], 'shape-label')
  plain.insert(['selection', 'shapeIds'], 'shape-card')
})

logSection('Update nested fields')
plain.transact('drag-and-select', () => {
  plain.replace(['shapes', 'shape-card', 'position', 'x'], 176)
  plain.replace(['shapes', 'shape-card', 'position', 'y'], 180)
  plain.replace(['shapes', 'shape-card', 'style', 'opacity'], 0.72)
  plain.insert(['selection', 'shapeIds'], 'shape-label')
})

logSection('External Yjs mutation')
doc.transact(() => {
  const selection = yMap.get('selection')
  if (!(selection instanceof Y.Map)) return

  const shapeIds = selection.get('shapeIds')
  if (!(shapeIds instanceof Y.Array)) return

  shapeIds.delete(0, shapeIds.length)
  shapeIds.insert(0, ['shape-label'])
  selection.set('locked', true)
}, 'remote-lock-selection')

logSection('Invalid writes return false')
console.log(
  'insert into non-array:',
  //@ts-ignore
  plain.insert(['document', 'title'], 'Nope'),
)
console.log(
  'replace missing shape:',
  plain.replace(['shapes', 'missing'], undefined),
)
console.log('store Date:', plain.set(['document', 'updatedAt'] as any, new Date()))

logSection('Final plain mirror')
console.log(JSON.stringify(plain.getState(), null, 2))
console.log(
  'Yjs JSON matches mirror:',
  JSON.stringify(yMap.toJSON()) === JSON.stringify(plain.state),
)

disposeSubscribe()
disposeObserve()
