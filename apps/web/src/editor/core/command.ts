import { Disposer } from '@gitborlando/toolkit/disposer'
import { listen } from '@gitborlando/utils/browser'
import hotkeys from 'hotkeys-js'
import { makeObservable } from 'mobx'
import { EditorSettingService } from 'src/editor/core/setting'
import { UndoService } from 'src/editor/core/undo'
import { HandleNodeService } from 'src/editor/handle/node'
import { HandlePageService } from 'src/editor/handle/page'
import { HandleSelectService } from 'src/editor/handle/select'
import { StageSceneService } from 'src/editor/render/scene'
import { StageInteractService } from 'src/editor/stage/interact/interact'
import { YStateService } from 'src/editor/y-adapter/y-state'
import { Command } from 'src/global/context-menu'
import { Service } from 'src/global/service'

export class EditorCommandService extends Service {
  constructor(
    private readonly handleNode: HandleNodeService,
    private readonly handlePage: HandlePageService,
    private readonly handleSelect: HandleSelectService,
    private readonly editorSetting: EditorSettingService,
    private readonly undo: UndoService,
    private readonly stageScene: StageSceneService,
    private readonly stageInteract: StageInteractService,
    private readonly yState: YStateService,
  ) {
    super()
    makeObservable(this)
    autoBind(this)
  }

  subscribe() {
    return this.bindHotkeys()
  }

  get copyPasteGroup(): Command[] {
    return [
      {
        name: t('copy'),
        shortcut: 'ctrl+c',
        when: () => !!this.handleSelect.selectIdList.length,
        callback: () => this.handleNode.copySelectedNodes(),
      },
      {
        name: t('paste'),
        shortcut: 'ctrl+v',
        when: () => !!this.handleNode.copiedIds.length,
        callback: () => this.handleNode.pasteNodes(),
      },
    ]
  }

  get undoRedoGroup(): Command[] {
    return [
      {
        name: t('undo'),
        shortcut: 'ctrl+z',
        callback: () => this.undo.undo(),
      },
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

    if (this.editorSetting.setting.devMode) {
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
      {
        name: t('create frame'),
        callback: () => this.handleNode.wrapInFrame(),
      },
      {
        name: t('delete'),
        shortcut: 'del',
        callback: () => this.handleNode.deleteSelectedNodes(),
      },
    ]

    if (this.editorSetting.setting.devMode) {
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
              console.log(this.stageScene.findElem(id)),
            )
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
        callback: () => this.handleNode.reHierarchySelectedNode('up'),
      },
      {
        name: t('move down'),
        shortcut: 'ctrl+[',
        callback: () => this.handleNode.reHierarchySelectedNode('down'),
      },
      {
        name: t('move to top'),
        shortcut: 'ctrl+alt+]',
        callback: () => this.handleNode.reHierarchySelectedNode('top'),
      },
      {
        name: t('move to bottom'),
        shortcut: 'ctrl+alt+[',
        callback: () => this.handleNode.reHierarchySelectedNode('bottom'),
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
