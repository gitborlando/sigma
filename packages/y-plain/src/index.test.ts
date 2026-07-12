import { describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { joinYPlainPath, YPlain } from './index'

type EditorState = {
  title: string
  nodes: { id: string; name: string; flags?: string[] }[]
}

type Rectangle = { id: string; width: number; fills: { color: string }[] }

type FlatState = { meta: { pageIds: string[] }; [id: string]: any }

const createPlain = () => {
  const doc = new Y.Doc()
  const yMap = doc.getMap('state')
  const plain = new YPlain<EditorState>(yMap, { title: 'Untitled', nodes: [] })

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

  it('writes id-keyed record paths with an explicit item type', () => {
    const doc = new Y.Doc()
    const yMap = doc.getMap('state')
    const rect: Rectangle = { id: 'rect-1', width: 100, fills: [{ color: 'red' }] }
    const plain = new YPlain<FlatState>(yMap, {
      meta: { pageIds: [] },
      [rect.id]: rect,
    })
    const disposeObserve = plain.observe()

    expect(plain.set<Rectangle>([rect.id, 'width'], 120)).toBe(true)
    expect(plain.replace<Rectangle>([rect.id, 'fills', 0, 'color'], 'blue')).toBe(
      true,
    )
    expect(plain.insert<Rectangle>([rect.id, 'fills'], { color: 'green' })).toBe(
      true,
    )
    expect(plain.set<Rectangle>(['rect-2'], { ...rect, id: 'rect-2' })).toBe(true)
    expect(plain.delete<Rectangle>([rect.id, 'fills', 0])).toBe(true)

    expect(plain.state).toEqual({
      meta: { pageIds: [] },
      'rect-1': { id: 'rect-1', width: 120, fills: [{ color: 'green' }] },
      'rect-2': { id: 'rect-2', width: 100, fills: [{ color: 'red' }] },
    })

    disposeObserve()
  })

  it('rejects invalid paths and non-serializable values', () => {
    const { plain } = createPlain()

    expect((plain as any).insert(['title'], 'Node')).toBe(false)
    expect(plain.replace(['nodes', 1], { id: 'missing', name: 'Missing' })).toBe(
      false,
    )
    expect(plain.set(['nodes', 0, 'flags'], [new Date()] as any)).toBe(false)
    expect(plain.set(['nodes'], [, { id: 'node-1', name: 'Header' }] as any)).toBe(
      false,
    )
  })

  it('compares plain fields named like object methods', () => {
    const yMap = new Y.Map()
    const plain = new YPlain<any>(yMap, {
      meta: { toString: 'plain', valueOf: 'data' },
    })

    expect(() =>
      plain.setState({ meta: { toString: 'plain', valueOf: 'data' } }),
    ).not.toThrow()
  })

  it('rejects unsupported Yjs abstract types', () => {
    const doc = new Y.Doc()
    const yMap = doc.getMap('state')
    yMap.set('text', new Y.Text())

    expect(() => new YPlain<any>(yMap)).toThrow('serializable')
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
        state: { title: 'Remote', nodes: [] },
      }),
    )
    expect(plain.state.title).toBe('Remote')

    disposeSubscribe()
    disposeObserve()
  })

  it('keeps add patches clean for observed Yjs map changes', () => {
    const { doc, plain, yMap } = createPlain()
    const listener = vi.fn()
    const disposeObserve = plain.observe()
    const disposeSubscribe = plain.subscribe(listener)

    doc.transact(() => {
      yMap.set('description', 'Remote')
    }, 'remote')

    const patch = listener.mock.calls[0][0].patches[0]
    expect(patch).toEqual({ type: 'add', keys: ['description'], value: 'Remote' })
    expect('oldValue' in patch).toBe(false)

    disposeSubscribe()
    disposeObserve()
  })

  it('groups YPlain writes in a transaction with origin', () => {
    const { plain } = createPlain()
    const listener = vi.fn()
    const disposeObserve = plain.observe()
    const disposeSubscribe = plain.subscribe(listener)

    const result = plain.transact('batch', () => {
      plain.set(['title'], 'Batch')
      plain.insert(['nodes'], { id: 'node-1', name: 'Header' })
      return 'done'
    })

    expect(result).toBe('done')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'batch',
        state: { title: 'Batch', nodes: [{ id: 'node-1', name: 'Header' }] },
      }),
    )

    disposeSubscribe()
    disposeObserve()
  })

  it('supports passing the transaction origin before the callback', () => {
    const { plain } = createPlain()
    const listener = vi.fn()
    const disposeObserve = plain.observe()
    const disposeSubscribe = plain.subscribe(listener)

    plain.transact('batch', () => {
      plain.set(['title'], 'Batch')
    })

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'batch' }),
    )

    disposeSubscribe()
    disposeObserve()
  })

  it('cleans pending transaction metadata when a listener throws', () => {
    const { plain } = createPlain()
    const error = new Error('listener failed')
    const first = vi.fn(() => {
      throw error
    })
    const second = vi.fn()
    const disposeFirst = plain.subscribe(first)
    const disposeSecond = plain.subscribe(second)

    expect(() =>
      plain.transact('broken', () => {
        plain.set(['title'], 'Broken')
      }),
    ).toThrow(error)

    expect(second).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'broken' }),
    )

    disposeFirst()
    plain.transact('recovered', () => {
      plain.set(['title'], 'Recovered')
    })

    expect(second).toHaveBeenLastCalledWith(
      expect.objectContaining({ origin: 'recovered' }),
    )

    disposeSecond()
  })

  it('keeps plain state readable inside a transaction', () => {
    const { plain } = createPlain()
    const disposeObserve = plain.observe()

    plain.transact(() => {
      expect(plain.set(['nodes', 0], { id: 'node-1', name: 'Header' })).toBe(false)
      expect(
        plain.insert(['nodes'], { id: 'node-1', name: 'Header', flags: [] }),
      ).toBe(true)
      expect(plain.get(['nodes', 0, 'flags'])).toEqual([])
      //@ts-ignore
      expect(plain.insert(['nodes', 0, 'flags'], 'selected')).toBe(true)
    })

    expect(plain.state.nodes).toEqual([
      { id: 'node-1', name: 'Header', flags: ['selected'] },
    ])

    disposeObserve()
  })

  it('joins paths for display', () => {
    expect(joinYPlainPath(['nodes', 0, 'name'])).toBe('nodes.0.name')
  })
})
