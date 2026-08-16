import { Disposer } from '@gitborlando/toolkit'
import { listen } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { makeObservable } from 'mobx'
import { NodeAction } from 'src/editor/action/node'
import { PageAction } from 'src/editor/action/page'
import { Undo } from 'src/editor/action/undo'
import { findNode, findPage } from 'src/editor/doc/finder'
import { RenderTree } from 'src/editor/render/tree'
import { Select } from 'src/editor/select'
import { Setting } from 'src/editor/setting'
import { StageInteract } from 'src/editor/stage/interact/interact'
import { ICommand } from 'src/global/context-menu'
import { Service } from '@gitborlando/di-service'

@reflection
export class Command extends Service {
  constructor(
    private readonly pageAction: PageAction,
    private readonly select: Select,
    private readonly setting: Setting,
    private readonly undo: Undo,
    private readonly renderTree: RenderTree,
    private readonly stageInteract: StageInteract,
    private readonly nodeAction: NodeAction,
  ) {
    super()
    autoBind(makeObservable(this))
    this.effect(this.bindHotkeys())
  }

  get copyPasteGroup(): ICommand[] {
    return [
      {
        name: t('copy'),
        shortcut: 'ctrl+c',
        when: () => !!this.select.selectIds.length,
        callback: () => this.nodeAction.copySelectedNodes(),
      },
      {
        name: t('paste'),
        shortcut: 'ctrl+v',
        when: () => !!this.nodeAction.copiedIds.length,
        callback: () => this.nodeAction.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): ICommand[] {
    return [
      { name: t('undo'), shortcut: 'ctrl+z', callback: () => this.undo.undo() },
      {
        name: t('redo'),
        shortcut: 'ctrl+shift+z',
        callback: () => this.undo.redo(),
      },
    ]
  }

  get pageGroup(): ICommand[] {
    const commands = [
      {
        name: t('delete page'),
        callback: ({ id }: IDPayload) => {
          this.pageAction.removePage(findPage(id))
        },
      },
    ]

    if (this.setting.devMode) {
      commands.push({
        name: t('print doc of one page'),
        callback: ({ id }: IDPayload) => {
          this.pageAction.DEV_logDocOfOnePage(id)
        },
      })
    }

    return commands
  }

  get nodeGroup(): ICommand[] {
    const commands = [
      {
        name: t('rename'),
        callback: ({ id }: IDPayload) => {
          this.nodeAction.renamingNodeId = id
        },
      },
      {
        name: t('create frame'),
        callback: () => {
          this.nodeAction.wrapInFrame()
        },
      },
      {
        name: t('delete'),
        shortcut: 'del',
        callback: () => {
          this.nodeAction.deleteSelectedNodes()
        },
      },
    ]

    if (this.setting.devMode) {
      commands.push(
        {
          name: t('print doc of one page'),
          callback: () => {
            this.select.selectIds.forEach((id) => console.log(findNode(id)))
          },
        },
        {
          name: t('print element'),
          callback: () => {
            this.select.selectIds.forEach((id) =>
              console.log(this.renderTree.findElem(id)),
            )
          },
        },
      )
    }

    return commands
  }

  get selectionGroup(): ICommand[] {
    return [
      {
        name: t('select all nodes'),
        shortcut: 'ctrl+a',
        callback: () => this.nodeAction.selectAllNodes(),
      },
    ]
  }

  get nodeReHierarchyGroup(): ICommand[] {
    return [
      {
        name: t('move up'),
        shortcut: 'ctrl+]',
        callback: () => this.nodeAction.reHierarchySelectedNode('up'),
      },
      {
        name: t('move down'),
        shortcut: 'ctrl+[',
        callback: () => this.nodeAction.reHierarchySelectedNode('down'),
      },
      {
        name: t('move to top'),
        shortcut: 'ctrl+alt+]',
        callback: () => this.nodeAction.reHierarchySelectedNode('top'),
      },
      {
        name: t('move to bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => this.nodeAction.reHierarchySelectedNode('bottom'),
      },
    ]
  }

  get createShapeGroup(): ICommand[] {
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

  get fileGroup(): ICommand[] {
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
    ].flat() as ICommand[]

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
