import { noopFunc } from '@gitborlando/utils'
import { listen } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { HandleNode } from 'src/editor/handle/node'
import { HandlePage } from 'src/editor/handle/page'
import { StageScene } from 'src/editor/render/scene'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { Command, ContextMenu } from 'src/global/context-menu'
import { getSelectIdList, getSetting } from '../utils/get'

class EditorCommandManager {
  subscribe() {
    this.bindHotkeys()
    return noopFunc
  }

  get copyPasteGroup(): Command[] {
    return [
      {
        name: t('copy'),
        shortcut: 'ctrl+c',
        when: () => !!getSelectIdList().length,
        callback: () => HandleNode.copySelectedNodes(),
      },
      {
        name: t('paste'),
        shortcut: 'ctrl+v',
        when: () => !!HandleNode.copiedIds.length,
        callback: () => HandleNode.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): Command[] {
    return [
      {
        name: t('undo'),
        shortcut: 'ctrl+z',
        callback: () => Undo.undo(),
      },
      {
        name: t('redo'),
        shortcut: 'ctrl+shift+z',
        callback: () => Undo.redo(),
      },
    ]
  }

  get pageGroup(): Command[] {
    const commands = [
      {
        name: t('delete page'),
        callback: ({ id }: { id: ID }) => {
          HandlePage.removePage(YState.find<S.Page>(id))
        },
      },
    ]

    if (getSetting().devMode) {
      commands.push({
        name: t('print schema'),
        callback: ({ id }: { id: ID }) => {
          HandlePage.DEV_logPageSchema(id)
        },
      })
    }

    return commands
  }

  get nodeGroup(): Command[] {
    const commands = [
      {
        name: t('rename'),
        callback: () => {
          const { id } = ContextMenu.context
          // UILeftPanelLayer.enterReName.dispatch(id)
        },
      },
      {
        name: t('create frame'),
        callback: () => HandleNode.wrapInFrame(),
      },
      {
        name: t('delete'),
        shortcut: 'del',
        callback: () => HandleNode.deleteSelectedNodes(),
      },
    ]

    if (getSetting().devMode) {
      commands.push(
        {
          name: t('print schema'),
          callback: () => {
            getSelectIdList().forEach((id) => {
              const node = YState.find<S.SchemaItem>(id)
              console.log(node)
            })
          },
        },
        {
          name: t('print element'),
          callback: () => {
            getSelectIdList().forEach((id) => {
              const elem = StageScene.findElem(id)
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
        callback: () => HandleNode.reHierarchySelectedNode('up'),
      },
      {
        name: t('move down'),
        shortcut: 'ctrl+[',
        callback: () => HandleNode.reHierarchySelectedNode('down'),
      },
      {
        name: t('move to top'),
        shortcut: 'ctrl+alt+]',
        callback: () => HandleNode.reHierarchySelectedNode('top'),
      },
      {
        name: t('move to bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => HandleNode.reHierarchySelectedNode('bottom'),
      },
    ]
  }

  get createShapeGroup(): Command[] {
    return [
      {
        name: t('select'),
        shortcut: 'v',
        callback: () => (StageInteract.interaction = 'select'),
      },
      {
        name: t('move'),
        shortcut: 'h',
        callback: () => (StageInteract.interaction = 'move'),
      },
    ]
  }

  get fileGroup(): Command[] {
    return [
      {
        name: t('delete file'),
        callback: () => {
          const { id } = ContextMenu.context
        },
      },
      {
        name: t('export file'),
        callback: () => {
          const { id } = ContextMenu.context
        },
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

    commandList.forEach(({ shortcut, callback }) => {
      if (!shortcut) return

      hotkeys(shortcut!, (keyboardEvent) => {
        keyboardEvent.preventDefault()
        if (['ctrl+c'].includes(shortcut!)) {
          if (isKeyDown) return
          isKeyDown = true
        }
        callback({})
      })
    })

    listen('keyup', () => (isKeyDown = false))
    listen('keydown', (e) => {
      if (e.altKey) e.preventDefault()
    })
  }
}

export const EditorCommand = new EditorCommandManager()
