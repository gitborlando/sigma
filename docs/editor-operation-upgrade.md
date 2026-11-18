# 编辑操作层

这是编辑操作的最终结构。迁移只是让现有调用方逐个改成使用它，不另外长出一套临时接口。

## 最终结构

一次用户意图只有一个执行入口。

```text
面板 / 快捷键 / 画布手势 / 以后的 AI
        │  构造意图
        ▼
   execute(intent)
        │  检查会话、预检整批、写入、封口一条历史、返回结果
        ▼
 DocCreator / DocMutator / 几何字段 apply
        │
        ▼
      文档变化 → 渲染
```

三方的职责不再交叉。

|      | 调用方                                | execute                                | 文档规则                               |
| ---- | ------------------------------------- | -------------------------------------- | -------------------------------------- |
| 做   | 把输入换成意图。选区只用来填写目标 ID | 会话、预检、整批写入、历史、结果       | 默认值、父子关系、几何和属性规则       |
| 不做 | 开事务、记历史、拼 Yjs 路径           | 读当前选区来猜测目标、处理鼠标和快捷键 | 读选区、记历史、决定这次算不算一条撤销 |

`DesignGeom.setGeom`、`NodeAction`、`StageCreate` 里现在各自开事务、改选区、调用 `undo.track` 的那些路径，最终都不再是编辑的入口。它们要么变成意图的构造方，要么剩下纯计算。

## 会话

一个 `Editor` 的一次打开是一个会话。

- `fileId`：哪个文件。同一个文件可以再次打开。
- `sessionId`：这一次打开的代号。`setupFile` 在替换文档之前就更新它。打开 A，再打开 B，再打开 A，第三次的代号与第一次不同。
- `revision`：已经提交的文档版本。从 0 开始，一次成功的文档意图加 1。
- `ready`：这次打开已经可以接受写入。`await yDoc.setup()` 期间是 false。

意图里带着构造时读到的 `sessionId` 和 `revision`。执行时对不上，文档、选区、历史都不变。

## 意图

意图描述要发生什么，不描述用户现在选中了谁。

```ts
type Intent = {
  sessionId: string
  revision: number
  description: string
  history: 'state' | 'client' | 'all'
  select?: Record<string, true>
  commands: Command[]
}

type Command =
  | {
      type: 'update-geometry'
      id: string
      changes: Partial<Record<DesignGeomKey, DesignGeomFieldValue>>
    }
  | {
      type: 'create-node'
      parentId: string
      index?: number
      node: {
        variant: 'frame' | 'rect' | 'text'
        x?: number
        y?: number
        width?: number
        height?: number
        content?: string
      }
    }
```

`commands` 是一次意图的全部内容。几何修改写在每个节点自己的命令上。多个节点各有各的角度或位置，仍然是同一条意图，不是循环调用多次 `execute`。

`select` 只有这次意图确实要留下新选区时才出现。没有这个字段，选区保持不动。

创建时 `index` 省略表示追加。给出时必须是整数，范围是 `0` 到父级 `childIds.length`。同一批创建按 `commands` 的顺序连续插入：第一条落在 `index`，下一条落在 `index + 1`。

以后删除、填充、重排、对齐都是新的 `Command`，走同一个 `execute`。不为它们再做入口。

## 执行

`execute(intent): EditResult` 是唯一的写入入口。它的行为固定为：

1. `ready` 为 false，返回 `session-not-ready`。
2. `sessionId` 与当前会话不一致，返回 `session-mismatch`。
3. `revision` 与当前文档版本不一致，返回 `revision-mismatch`。
4. 有尚未 `commit` 或 `cancel` 的连续交互，返回 `operation-in-progress`。
5. 预检全部命令。任一命令不合法，整批不写，返回对应错误。
6. 为这次意图独占一次撤销捕获，按顺序执行命令。
7. 中途失败，只回滚这次捕获。文档、父子关系、选区和 `revision` 回到进入 `execute` 时的值，不入栈。
8. 成功且有净变化，把这次捕获封成一条历史。没有净变化则不入栈。
9. 返回 `EditResult`。

回滚只撤销这次捕获里的本地修改，不用旧文档整份覆盖。预检和执行都不 `await`。

节点不存在是 `target-missing`。字段不被该节点支持，或直线被写入 `height`，是 `property-unsupported`。数字不是有限数、宽高小于 0、`index` 越界，是 `value-invalid`。父级不存在或不能容纳子节点，是 `parent-invalid`。命令列表为空是 `empty-input`。

`EditResult` 同时给出这三项：

- `changed`：这次意图留下了有效变化，文档或选区都算。
- `revision`：返回时的文档版本。
- `history.recorded`：这次有没有入撤销栈。

失败和没有净变化时，`changed` 为 false，`history.recorded` 为 false，`revision` 保持入口值。只改选区时 `revision` 不变，选区变了则 `changed` 为 true，并按 `history: 'client'` 入栈。

## 连续交互

拖动、缩放、滑条使用同一种命令、同一个执行器。差别只是捕获何时封口。

```ts
begin(intent): { operationId: string; result: EditResult }
apply(operationId: string, commands: Command[]): EditResult
commit(operationId: string): EditResult
cancel(operationId: string): EditResult
```

`begin` 做会话检查和预检，打开这次意图的捕获，返回 `operationId`。`apply` 只接受这个 ID，把后续命令写进同一次捕获。`commit` 在相对起点有净变化时封口一条历史。`cancel` 回滚整次捕获，包括这段时间里新建的节点、父子关系和层级，再恢复 `begin` 时的选区。

第二次 `begin`、错误的 `operationId`、过期回调、切换文件，都不能写入这打开的捕获。切换文件时，未结束的交互先 `cancel`。长停顿也不能把同一次交互拆成多条撤销。

## 调用方最终变成什么

| 现在                                           | 最终                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| 几何面板的数字确认、宽高比、单选翻转、旋转 90° | 构造 `update-geometry` 命令，调用 `execute`                  |
| 几何滑条、移动、缩放、旋转、画布创建           | 构造同样的命令，调用 `begin` / `apply` / `commit` / `cancel` |
| 填充、描边、删除、粘贴、层级、对齐、页面       | 各自的 `Command`，调用 `execute`                             |
| `Command` 快捷键                               | 从选区取出 ID，构造意图                                      |
| `FileAction`                                   | 只创建文件和初始文档，不持有选区和撤销                       |
| `docGetter`                                    | 去掉。读取使用这次会话的文档                                 |

多选翻转是一组矩阵计算，最终由手势算出每个节点的几何命令，再进入同一次 `begin` / `commit`。它不是单独的归档函数。

## 文件组织

类型放在环境声明里，和 `types/design.d.ts` 的 `namespace S` 一样。实现按职责拆开。`execute` 不包含几何规则，几何文件也不负责封口历史。

```text
types/operation.d.ts                         namespace Edit

apps/web/src/editor/operation/
  index.ts                                   注册成 Editor 的 editOperation
  gate.ts                                    会话、修订号、有没有未结束的交互
  execute.ts                                 一次性意图的流水线
  interaction.ts                             begin / apply / commit / cancel
  command/
    geometry.ts                              update-geometry 的预检和写入
    create-node.ts                           create-node 的预检和写入
    fill.ts
    stroke.ts
    delete-node.ts
    hierarchy.ts
    align.ts
    page.ts
    select.ts

apps/web/src/editor/session.ts               fileId、sessionId、ready
apps/web/src/editor/y-adapter/y-doc.ts       revision
apps/web/src/editor/action/undo.ts           一次意图的捕获、封口、回滚
```

`types/operation.d.ts` 只有类型，使用 `namespace Edit`。这里放 `Intent`、`Command`、`EditError`、`EditResult`，以及每种命令的处理约定：

```ts
type CommandHandler<C extends Command> = {
  precheck: (command: C, doc: S.Doc) => EditError[]
  apply: (command: C, ctx: ApplyContext) => void
}
```

`ApplyContext` 只包含这次写入要用的 `YDoc`、`DocMutator`、`DocCreator`。不包含 `Select` 和 `Undo`。

| 文件                   | 里面有什么                                                                                | 里面没有什么                 |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| `types/operation.d.ts` | 意图、命令、结果、错误码、`CommandHandler`                                                | 函数实现                     |
| `gate.ts`              | `ready`、`sessionId`、`revision`、是否已有打开的交互                                      | 文档修改                     |
| `execute.ts`           | 按顺序调用 gate、全部 `precheck`、捕获、全部 `apply`、封口或回滚                          | 某个字段怎么写、节点怎么创建 |
| `interaction.ts`       | `operationId`，以及捕获跨多次调用时的 begin / apply / commit / cancel                     | 另一套几何或创建规则         |
| `command/*.ts`         | 这一种命令的预检和 `apply`                                                                | 会话检查、撤销栈、选区来源   |
| `index.ts`             | 把命令类型对应到处理函数，并把 `execute`、`begin`、`apply`、`commit`、`cancel` 挂到服务上 | 业务分支                     |
| `session.ts`           | 一次打开的身份。代号在 `yDoc.setup` 之前更新                                              | 编辑命令                     |
| `y-doc.ts`             | 成功意图后 `revision` 加 1，回滚后回到入口值                                              | 意图是否合法                 |
| `undo.ts`              | 打开捕获、封成一条、失败时撤掉这次多出的撤销项并丢掉这次的 patch                          | 节点和字段的含义             |

新增一种编辑能力时，在 `namespace Edit` 里加一个 `Command`，并增加一个 `command/*.ts`。入口仍然是 `execute` 和 `interaction.ts`。

`index.ts` 注册到 `apps/web/src/editor/index.ts` 的 `editorServices`，名字是 `editOperation`。

## 第一刀

第一刀只增加这些文件：

- `types/operation.d.ts`
- `operation/gate.ts`
- `operation/execute.ts`
- `operation/command/geometry.ts`
- `operation/command/create-node.ts`
- `operation/index.ts`

同时给现有的 `session.ts`、`y-doc.ts`、`undo.ts` 补上表里那一项。`interaction.ts` 以及填充、描边、删除、层级、对齐、页面、选区这些命令文件随后按同一种形状加，不改变入口。

面板只迁移一次性输入。`useSetGeomValue`、锁定宽高比、单选翻转、旋转 90° 构造 `update-geometry` 命令并调用 `execute`。旋转 90° 为每个节点填写自己的 `rotation + 90`。

几何滑条、`StageTransformer`、`StageCreate` 仍走原来的路径，直到 `interaction.ts` 接上。它们不调用 `execute`。

第一刀的验收：

1. 不打开面板，对节点 A 执行 `update-geometry`。选区停在 B。A 改变，历史一条，选区仍是 B。撤销只回到这次之前。
2. 紧接着再执行一次。两次是两条历史。
3. 创建两个节点，第二条在执行中失败。父级 `childIds`、选区、`revision`、撤销栈都与调用前相同。
4. 加载未完成时执行，返回 `session-not-ready`。打开 A → B → A 后，用第一次的 `sessionId` 执行，返回 `session-mismatch`。用过期的 `revision` 执行，返回 `revision-mismatch`。
5. 面板输入框改 `x`、锁定宽高比、单选翻转、旋转 90° 都经过 `execute`。滑条和画布拖动的行为与第一刀之前相同。
