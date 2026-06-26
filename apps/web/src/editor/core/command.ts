import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { EditorService } from 'src/editor/service'
import { Command } from 'src/global/context-menu'
import { getSelectIdList, getSetting } from '../utils/get'

export class EditorCommandService extends EditorService {
  subscribe() {
    return this.bindHotkeys()
  }

  get copyPasteGroup(): Command[] {
    return [
      {
        name: t('copy'),
        shortcut: 'ctrl+c',
        when: () => !!getSelectIdList(this.editor).length,
        callback: () => this.editor.handleNode.copySelectedNodes(),
      },
      {
        name: t('paste'),
        shortcut: 'ctrl+v',
        when: () => !!this.editor.handleNode.copiedIds.length,
        callback: () => this.editor.handleNode.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): Command[] {
    return [
      {
        name: t('undo'),
        shortcut: 'ctrl+z',
        callback: () => this.editor.undo.undo(),
      },
      {
        name: t('redo'),
        shortcut: 'ctrl+shift+z',
        callback: () => this.editor.undo.redo(),
      },
    ]
  }

  get pageGroup(): Command[] {
    const commands = [
      {
        name: t('delete page'),
        callback: ({ id }: IDPayload) => {
          this.editor.handlePage.removePage(this.editor.find<S.Page>(id))
        },
      },
    ]

    if (getSetting(this.editor).devMode) {
      commands.push({
        name: t('print schema'),
        callback: ({ id }: IDPayload) => {
          this.editor.handlePage.DEV_logPageSchema(id)
        },
      })
    }

    return commands
  }

  get nodeGroup(): Command[] {
    const commands = [
      {
        name: t('rename'),
        callback: ({ id }: IDPayload) => {
          // UILeftPanelLayer.enterReName.dispatch(id)
        },
      },
      {
        name: t('create frame'),
        callback: () => this.editor.handleNode.wrapInFrame(),
      },
      {
        name: t('delete'),
        shortcut: 'del',
        callback: () => this.editor.handleNode.deleteSelectedNodes(),
      },
    ]

    if (getSetting(this.editor).devMode) {
      commands.push(
        {
          name: t('print schema'),
          callback: () => {
            getSelectIdList(this.editor).forEach((id) => {
              const node = this.editor.find<S.SchemaItem>(id)
              console.log(node)
            })
          },
        },
        {
          name: t('print element'),
          callback: () => {
            getSelectIdList(this.editor).forEach((id) => {
              const elem = this.editor.stageScene.findElem(id)
              console.log(elem)
            })
          },
        },
      )
    }

    return commands
  }

  get nodeReHierarchyGroup(): Command[] {
    return [
      {
        name: t('move up'),
        shortcut: 'ctrl+]',
        callback: () => this.editor.handleNode.reHierarchySelectedNode('up'),
      },
      {
        name: t('move down'),
        shortcut: 'ctrl+[',
        callback: () => this.editor.handleNode.reHierarchySelectedNode('down'),
      },
      {
        name: t('move to top'),
        shortcut: 'ctrl+alt+]',
        callback: () => this.editor.handleNode.reHierarchySelectedNode('top'),
      },
      {
        name: t('move to bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => this.editor.handleNode.reHierarchySelectedNode('bottom'),
      },
    ]
  }

  get createShapeGroup(): Command[] {
    return [
      {
        name: t('select'),
        shortcut: 'v',
        callback: () => (this.editor.stageInteract.interaction = 'select'),
      },
      {
        name: t('move'),
        shortcut: 'h',
        callback: () => (this.editor.stageInteract.interaction = 'move'),
      },
    ]
  }

  get fileGroup(): Command[] {
    return [
      {
        name: t('delete file'),
        callback: () => {},
      },
      {
        name: t('export file'),
        callback: () => {},
      },
    ]
  }

  private bindHotkeys = () => {
    let isKeyDown = false
    const commandList = [
      this.copyPasteGroup,
      this.undoRedoGroup,
      this.pageGroup,
      this.nodeGroup,
      this.nodeReHierarchyGroup,
      this.createShapeGroup,
      this.fileGroup,
    ].flat() as Command[]

    commandList.forEach(({ shortcut, callback, when }) => {
      if (!shortcut) return

      hotkeys(shortcut!, (keyboardEvent) => {
        keyboardEvent.preventDefault()
        if (['ctrl+c'].includes(shortcut!)) {
          if (isKeyDown) return
          isKeyDown = true
        }
        if (!when || when()) callback({})
      })
    })

    return Disposer.combine(
      () => hotkeys.unbind(),
      listen('keyup', () => (isKeyDown = false)),
      listen('keydown', (e) => {
        if (e.altKey) e.preventDefault()
      }),
    )
  }
}
