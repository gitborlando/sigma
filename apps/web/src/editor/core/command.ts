import { Disposer } from '@gitborlando/toolkit'
import { listen } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { makeObservable } from 'mobx'
import { NodeController } from 'src/editor/controller/node'
import { Setting } from 'src/editor/core/setting'
import { Undo } from 'src/editor/core/undo'
import { HandlePage } from 'src/editor/handle/page'
import { HandleSelect } from 'src/editor/handle/select'
import { RenderTree } from 'src/editor/render/tree'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { YState } from 'src/editor/y-adapter/y-state'
import { Command } from 'src/global/context-menu'
import { Service } from 'src/global/service'

@reflection
export class EditorCommand extends Service {
  constructor(
    private readonly handlePage: HandlePage,
    private readonly handleSelect: HandleSelect,
    private readonly setting: Setting,
    private readonly undo: Undo,
    private readonly renderTree: RenderTree,
    private readonly stageInteract: StageInteract,
    private readonly yState: YState,
    private readonly nodeController: NodeController,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(this.bindHotkeys())
  }

  get copyPasteGroup(): Command[] {
    return [
      {
        name: t('copy'),
        shortcut: 'ctrl+c',
        when: () => !!this.handleSelect.selectIdList.length,
        callback: () => this.nodeController.copySelectedNodes(),
      },
      {
        name: t('paste'),
        shortcut: 'ctrl+v',
        when: () => !!this.nodeController.copiedIds.length,
        callback: () => this.nodeController.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): Command[] {
    return [
      { name: t('undo'), shortcut: 'ctrl+z', callback: () => this.undo.undo() },
      {
        name: t('redo'),
        shortcut: 'ctrl+shift+z',
        callback: () => this.undo.redo(),
      },
    ]
  }

  get pageGroup(): Command[] {
    const commands = [
      {
        name: t('delete page'),
        callback: ({ id }: IDPayload) => {
          this.handlePage.removePage(this.yState.find<S.Page>(id))
        },
      },
    ]

    if (this.setting.devMode) {
      commands.push({
        name: t('print schema'),
        callback: ({ id }: IDPayload) => {
          this.handlePage.DEV_logPageSchema(id)
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
      { name: t('create frame'), callback: () => this.nodeController.wrapInFrame() },

      {
        name: t('delete'),
        shortcut: 'del',
        callback: () => this.nodeController.deleteSelectedNodes(),
      },
    ]

    if (this.setting.devMode) {
      commands.push(
        {
          name: t('print schema'),
          callback: () => {
            this.handleSelect.selectIdList.forEach((id) =>
              console.log(this.yState.find<S.SchemaItem>(id)),
            )
          },
        },
        {
          name: t('print element'),
          callback: () => {
            this.handleSelect.selectIdList.forEach((id) =>
              console.log(this.renderTree.findElem(id)),
            )
          },
        },
      )
    }

    return commands
  }

  get selectionGroup(): Command[] {
    return [
      {
        name: t('select all nodes'),
        shortcut: 'ctrl+a',
        callback: () => this.nodeController.selectAllNodes(),
      },
    ]
  }

  get nodeReHierarchyGroup(): Command[] {
    return [
      {
        name: t('move up'),
        shortcut: 'ctrl+]',
        callback: () => this.nodeController.reHierarchySelectedNode('up'),
      },
      {
        name: t('move down'),
        shortcut: 'ctrl+[',
        callback: () => this.nodeController.reHierarchySelectedNode('down'),
      },
      {
        name: t('move to top'),
        shortcut: 'ctrl+alt+]',
        callback: () => this.nodeController.reHierarchySelectedNode('top'),
      },
      {
        name: t('move to bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => this.nodeController.reHierarchySelectedNode('bottom'),
      },
    ]
  }

  get createShapeGroup(): Command[] {
    return [
      {
        name: t('select'),
        shortcut: 'v',
        callback: () => (this.stageInteract.interaction = 'select'),
      },
      {
        name: t('move'),
        shortcut: 'h',
        callback: () => (this.stageInteract.interaction = 'move'),
      },
    ]
  }

  get fileGroup(): Command[] {
    return [
      { name: t('delete file'), callback: () => {} },
      { name: t('export file'), callback: () => {} },
    ]
  }

  private bindHotkeys = () => {
    let isKeyDown = false
    const commandList = [
      this.copyPasteGroup,
      this.undoRedoGroup,
      this.pageGroup,
      this.nodeGroup,
      this.selectionGroup,
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
