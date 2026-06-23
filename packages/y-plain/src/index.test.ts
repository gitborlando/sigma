import * as Y from 'yjs'
import { describe, expect, it, vi } from 'vitest'
import { joinYPlainPath, YPlain } from './index'

type EditorState = {
  title: string
  nodes: {
    id: string
    name: string
    flags?: string[]
  }[]
}

const createPlain = () => {
  const doc = new Y.Doc()
  const yMap = doc.getMap('state')
  const plain = new YPlain<EditorState>(yMap, {
    title: 'Untitled',
    nodes: [],
  })

  return { doc, plain, yMap }
}

describe('YPlain', () => {
  it('initializes plain state from a Y.Map and reads typed paths', () => {
    const { plain, yMap } = createPlain()

    expect(plain.state).toEqual({ title: 'Untitled', nodes: [] })
    expect(plain.getState()).toEqual({ title: 'Untitled', nodes: [] })
    expect(plain.get(['title'])).toBe('Untitled')
    expect(yMap.toJSON()).toEqual({ title: 'Untitled', nodes: [] })
  })

  it('writes serializable values through Yjs operations', () => {
    const { plain, yMap } = createPlain()

    expect(plain.set(['title'], 'Draft')).toBe(true)
    expect(plain.insert(['nodes'], { id: 'node-1', name: 'Header' })).toBe(true)
    expect(plain.insert(['nodes', 0], { id: 'node-0', name: 'Cover' })).toBe(true)
    expect(plain.replace(['nodes', 1, 'name'], 'Footer')).toBe(true)
    expect(plain.delete(['nodes', 0])).toBe(true)

    expect(yMap.toJSON()).toEqual({
      title: 'Draft',
      nodes: [{ id: 'node-1', name: 'Footer' }],
    })
  })

  it('rejects invalid paths and non-serializable values', () => {
    const { plain } = createPlain()

    expect((plain as any).insert(['title'], 'Node')).toBe(false)
    expect(plain.replace(['nodes', 1], { id: 'missing', name: 'Missing' })).toBe(
      false,
    )
    expect(plain.set(['nodes', 0, 'flags'], [new Date()] as any)).toBe(false)
  })

  it('observes Yjs changes as plain state and patches', () => {
    const { doc, plain, yMap } = createPlain()
    const listener = vi.fn()
    const disposeObserve = plain.observe()
    const disposeSubscribe = plain.subscribe(listener)

    doc.transact(() => {
      yMap.set('title', 'Remote')
    }, 'remote')

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'remote',
        patches: [
          {
            type: 'replace',
            keys: ['title'],
            value: 'Remote',
            oldValue: 'Untitled',
          },
        ],
        state: {
          title: 'Remote',
          nodes: [],
        },
      }),
    )
    expect(plain.state.title).toBe('Remote')

    disposeSubscribe()
    disposeObserve()
  })

  it('groups YPlain writes in a transaction with origin', () => {
    const { plain } = createPlain()
    const listener = vi.fn()
    const disposeObserve = plain.observe()
    const disposeSubscribe = plain.subscribe(listener)

    const result = plain.transact(() => {
      plain.set(['title'], 'Batch')
      plain.insert(['nodes'], { id: 'node-1', name: 'Header' })
      return 'done'
    }, 'batch')

    expect(result).toBe('done')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'batch',
        state: {
          title: 'Batch',
          nodes: [{ id: 'node-1', name: 'Header' }],
        },
      }),
    )

    disposeSubscribe()
    disposeObserve()
  })

  it('joins paths for display', () => {
    expect(joinYPlainPath(['nodes', 0, 'name'])).toBe('nodes.0.name')
  })
})
