import hotkeys from 'hotkeys-js'
import { getEditorSetting } from 'src/editor/editor/setting'
import { HandleNode } from 'src/editor/handle/node'
import { HandlePage } from 'src/editor/handle/page'
import { StageScene } from 'src/editor/render/scene'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { getSelectIdList } from 'src/editor/y-state/y-clients'
import { Command, ContextMenu } from 'src/global/context-menu'
import { listen } from 'src/shared/utils/event'

class EditorCommandManager {
  init() {
    this.bindHotkeys()
  }

  get copyPasteGroup(): Command[] {
    return [
      {
        name: t('verb.copy'),
        shortcut: 'ctrl+c',
        when: () => !!getSelectIdList().length,
        callback: () => HandleNode.copySelectedNodes(),
      },
      {
        name: t('verb.paste'),
        shortcut: 'ctrl+v',
        when: () => !!HandleNode.copiedIds.length,
        callback: () => HandleNode.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): Command[] {
    return [
      {
        name: t('verb.undo'),
        shortcut: 'ctrl+z',
        callback: () => YUndo.undo(),
      },
      {
        name: t('verb.redo'),
        shortcut: 'ctrl+shift+z',
        callback: () => YUndo.redo(),
      },
    ]
  }

  get pageGroup(): Command[] {
    const commands = [
      {
        name: sentence(t('verb.delete'), t('noun.page')),
        callback: ({ id }: { id: ID }) => {
          HandlePage.removePage(YState.find<S.Page>(id))
        },
      },
    ]

    if (getEditorSetting().devMode) {
      commands.push({
        name: sentence(t('verb.print'), 'schema'),
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
        name: t('verb.rename'),
        callback: () => {
          const { id } = ContextMenu.context
          // UILeftPanelLayer.enterReName.dispatch(id)
        },
      },
      {
        name: sentence(t('verb.create'), t('noun.frame')),
        callback: () => HandleNode.wrapInFrame(),
      },
      {
        name: t('verb.delete'),
        shortcut: 'del',
        callback: () => HandleNode.deleteSelectedNodes(),
      },
    ]

    if (getEditorSetting().devMode) {
      commands.push(
        {
          name: sentence(t('verb.print'), 'schema'),
          callback: () => {
            getSelectIdList().forEach((id) => {
              const node = YState.find<S.SchemaItem>(id)
              console.log(node)
            })
          },
        },
        {
          name: sentence(t('verb.print'), 'elem'),
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
        name: sentence(t('verb.moveTo'), 'up'),
        shortcut: 'ctrl+]',
        callback: () => HandleNode.reHierarchySelectedNode('up'),
      },
      {
        name: sentence(t('verb.moveTo'), 'down'),
        shortcut: 'ctrl+[',
        callback: () => HandleNode.reHierarchySelectedNode('down'),
      },
      {
        name: sentence(t('verb.moveTo'), 'top'),
        shortcut: 'ctrl+alt+]',
        callback: () => HandleNode.reHierarchySelectedNode('top'),
      },
      {
        name: sentence(t('verb.moveTo'), 'bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => HandleNode.reHierarchySelectedNode('bottom'),
      },
    ]
  }

  get createShapeGroup(): Command[] {
    return [
      {
        name: t('verb.select'),
        shortcut: 'v',
        callback: () => (StageInteract.interaction = 'select'),
      },
      {
        name: t('verb.move'),
        shortcut: 'h',
        callback: () => (StageInteract.interaction = 'move'),
      },
    ]
  }

  get fileGroup(): Command[] {
    return [
      {
        name: sentence(t('verb.delete'), t('noun.file')),
        callback: () => {
          const { id } = ContextMenu.context
        },
      },
      {
        name: sentence(t('verb.export'), t('noun.file')),
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
