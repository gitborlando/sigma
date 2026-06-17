# editor 模块 review

范围：`apps/web/src/editor/editor`

## 模块意图

`editor` 模块像是编辑器内核的启动器和全局协调层：

- `editor.ts` 负责初始化 setting、command、operate、stage、render、schema、YState。
- `command.ts` 负责快捷键和右键菜单命令集合。
- `client-undo.ts` 负责本地 UI 状态 undo。
- `undo-service.ts` 负责把 Yjs 文档 undo 与 client undo 合并成用户可感知的 undo/redo。
- `setting.ts` 负责编辑器配置持久化。
- `img-manager.ts` 负责图片加载和缓存。
- `mock/*` 和 `client-undo.test.ts` 用于开发实验。

这个模块的定位应该是“编辑器应用服务层”，不要承载太多具体领域逻辑。

## 架构评价

### 优点

- `EditorService` 用 `Disposer` 统一订阅多个子系统，说明你已经意识到编辑器需要显式生命周期。
- `initHooks()` 把操作模块的 hook 初始化集中起来，入口清楚。
- `ClientUndo` 单独抽出是很好的方向。选择状态、视口状态、面板状态这类 client-only 状态不应该塞进 Y.Doc。
- `Undo` 试图统一文档状态和 client 状态，这符合真实编辑器的用户预期。
- `ImgManager` 有缓存意识，避免重复加载同一图片。

### 主要问题

#### 1. `EditorService` 同时承担 bootstrap、文件 IO、schema migration、mock、YState 初始化

`initSchema()` 里既处理 mock，又处理文件元信息、zip 解包、json parse、migration、YState 初始化、YClients 初始化、StageViewport 初始化。这会让 editor 层变成“万能启动脚本”。

更理想的边界：

- `FileSchemaLoader`：从 fileId 得到原始 schema。
- `SchemaBootstrap`：migration、初始化 YState。
- `EditorRuntime`：启动 stage/render/operate 生命周期。

不一定要马上拆文件，但应该从命名和职责上把这些边界分出来。

#### 2. 生命周期不完整，存在重复注册风险

`EditorService.subscribe()` 有 disposer，但以下初始化路径没有明显 disposer：

- `EditorCommand.init()` 绑定 hotkeys 和 window key listener。
- `OperateAlign.initHook()` / `OperateStroke.initHook()` / `OperateShadow.initHook()` / `OperateText.initHook()` 注册 Signal hook 或 YState subscribe。
- `EditorSetting.autoSaveSetting()` 注册 MobX reaction。

如果 editor dispose 后重新 init，这些 hook 可能重复存在。当前 `initEditor()` 用 `inited` 避免重复初始化，但 `dispose()` 会把 `inited` 设回 false，所以重进页面时有累积风险。

建议：所有 `initHook/init` 返回 disposer，由 `EditorService` 接管。

#### 3. `command.ts` 命令模型与快捷键执行模型不一致

命令对象里有 `when`，但 `bindHotkeys()` 执行快捷键时没有检查 `when`。这会造成 context menu 和快捷键行为不一致。

例子：

- copy 的 menu 可能按 `when` 隐藏，但快捷键仍会执行 callback。
- delete / reorder 等命令没有统一的可执行条件。

建议把命令执行收敛成 `execute(command, payload)`，内部统一判断 `when`、preventDefault、track、错误处理。

#### 4. `Undo` 设计目标很好，但回放边界不够强

`UndoInfo` 保存了 `statePatches` 和 `clientState`，但实际 undo/redo 回放时：

- 文档状态靠 `Y.UndoManager.undo/redo()`。
- client 状态靠 `ClientUndo.undo/redo()`。
- `statePatches` 只记录不回放。

这意味着 `restoreHistory()` 只能恢复 stack 和 next，不能恢复 Y.UndoManager 的内部历史。对于“快照恢复 / dev snapshot / 重新打开文件恢复 history”这类场景会不完整。

建议明确 `UndoInfo.statePatches` 的用途：

- 如果只是 debug 信息，就不要让名字暗示它可恢复。
- 如果要支持恢复，就需要 patch replay 或保存 Yjs update。

#### 5. `ClientUndo` 抽象不错，但 register 时机要求很隐性

`ClientUndo.register()` 要求必须在产生历史之前注册，否则会 throw。这是合理约束，但现在依赖模块构造函数和 init 顺序自然满足，缺少架构层说明。

建议：

- 把 client undo slice 注册集中在 editor bootstrap。
- 或者给 `register()` 的错误信息带上当前 history metadata，方便定位是谁过晚注册。

#### 6. `setting.ts` 混入 dev 配置且没有配置版本

`EditorSetting` 把 autosave、FPS、render 策略、dev sceneMatrix 都放在一个 localStorage key 下。短期方便，但长期会遇到：

- 设置结构变化没有 migration。
- dev 配置污染普通用户配置。
- `reaction(() => jsonFy(this.setting))` 对整个对象序列化，粒度较粗。

建议至少增加 setting version，并考虑把 dev setting 独立 key 存储。

#### 7. `img-manager.ts` 错误处理不足

`loadImage()` 只处理 `onload`，没有 `onerror`。`uploadLocal()` 也没有 reject 分支。图片加载失败时 Promise 会悬挂，渲染层会一直等缓存。

另外 `IImage.arrayBuffer` 定义了但未设置；如果后续不需要，类型应删掉，避免误导。

#### 8. mock 和正式启动路径耦合

`editor.ts` 直接 import `mock_transform_v`，`fileId === 'mock'` 时走 mock。这对开发方便，但 mock fixture 已经进入正式启动器。

建议把 mock schema 注册成 dev-only loader，或者至少放到 `editor/dev-fixtures` 并明确标注实验用途。当前 `transfrom` 拼写也会降低可读性。

## 文件级评价

### `editor.ts`

定位正确，但职责偏胖。建议把文件加载、schema migration、runtime subscribe 分开。`initSchema()` 失败时也应有明确错误状态，而不是静默不初始化。

### `command.ts`

命令分组清楚，适合被 header、context menu、hotkeys 共用。但执行层不尊重 `when`，hotkey 绑定也没有 disposer，是当前主要问题。

### `client-undo.ts`

是这个模块里最独立、方向最清楚的代码。slice 注册、target 同步、batch、archive、canUndo/canRedo 都比较完整。后续重点是补真实测试，而不是大改结构。

### `undo-service.ts`

方向正确，但现在更像“协调两个 undo 栈”，还不是完整的“编辑事务历史”。如果后面要做协同 undo、历史恢复、操作合并，需要重新定义 `UndoInfo` 的权责。

### `setting.ts`

小而清楚，但生命周期和版本管理不足。注意 `init()` 多次调用时 reaction 可能重复。

### `img-manager.ts`

缓存方向对，但需要补失败、取消、释放策略。图片是编辑器高频资源，不能让加载失败变成悬挂 Promise。

### `mock/*` 与 `client-undo.test.ts`

对开发有价值，但建议和正式 editor runtime 解耦。`client-undo.test.ts` 目前更像手动实验脚本，不是标准测试文件：有 `autorun`、`console.log`、`setTimeout`，不会形成可自动断言的测试。

## 建议优先级

1. 让所有 `init/initHook` 返回 disposer，由 `EditorService` 统一管理。
2. 让 `EditorCommand` 执行快捷键时检查 `when`，并支持 dispose hotkeys。
3. 把 `initSchema()` 拆成 loader + migration + runtime 初始化。
4. 明确 `UndoInfo.statePatches` 是 debug 还是恢复机制。
5. 给 settings 增加版本，给 image loading 补错误处理。
