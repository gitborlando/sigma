import { makeObservable, observable } from 'mobx'
import { describe, expect, it, vi } from 'vitest'
import { MobxUndoService, type MobxUndoSlice } from './index'

type DraftState = {
  count: number
  title: string
  flags: Record<string, boolean>
}

class DraftStore {
  count = 0
  title = 'Untitled'
  flags: Record<string, boolean> = { selected: true }
  slice: MobxUndoSlice<DraftState>

  constructor(private mobxUndo: MobxUndoService) {
    makeObservable(this, {
      count: observable.ref,
      title: observable.ref,
      flags: observable.ref,
    })
    this.slice = this.mobxUndo.register('draft', this, ['count', 'title', 'flags'])
  }
}

describe('MobxUndoService', () => {
  it('syncs registered observable fields through undo and redo', () => {
    const mobxUndo = new MobxUndoService()
    const store = new DraftStore(mobxUndo)

    store.slice.set((state) => {
      state.count = 1
      state.title = 'First'
      state.flags = { selected: false }
    })
    mobxUndo.archive()

    store.slice.set((state) => {
      state.count = 2
      state.title = 'Second'
      state.flags = { selected: true, hovered: true }
    })
    mobxUndo.archive()

    expect(store.count).toBe(2)
    expect(store.title).toBe('Second')
    expect(store.flags).toEqual({ selected: true, hovered: true })

    mobxUndo.undo()

    expect(store.count).toBe(1)
    expect(store.title).toBe('First')
    expect(store.flags).toEqual({ selected: false })

    mobxUndo.redo()

    expect(store.count).toBe(2)
    expect(store.title).toBe('Second')
    expect(store.flags).toEqual({ selected: true, hovered: true })
  })

  it('clones observable state when registering and notifies slice listeners', () => {
    const mobxUndo = new MobxUndoService()
    const store = new DraftStore(mobxUndo)
    const listener = vi.fn()

    store.slice.subscribe(listener)
    store.flags.selected = false

    expect(mobxUndo.get<DraftState>('draft')).toEqual({
      count: 0,
      title: 'Untitled',
      flags: { selected: true },
    })

    store.slice.set((state) => {
      state.count = 1
    })

    expect(listener).toHaveBeenCalledWith({
      count: 1,
      title: 'Untitled',
      flags: { selected: true },
    })
  })
})
