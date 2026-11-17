# 编辑操作升级清单

对应计划：`docs/editor-operation-architecture.md`。

代码由你改。这份清单只做一件事：让一次编辑有唯一负责人。

## 核心

负责人接收明确意图，完成校验、组合修改、历史边界和结果。面板、快捷键、画布手势以后都只产生意图。

一次编辑现在没有这个负责人。几何面板改完文档后，由 React 再记历史。画布创建由 `StageCreate` 同时做几何、建节点、挂父子、改选区和记历史。填充、描边、删除在函数内部读取 `Select`。调用方必须知道每个方法有没有开事务、有没有改选区、有没有记历史。

改完的判据：

> 不挂载 React、不模拟鼠标、不先改选区，调用负责人，就能对明确的节点完成一次编辑，并得到正确的历史和结果。

同时还要能回答：改的是哪个会话、哪个版本、哪些节点；谁校验；谁归档；连续操作何时开始、提交、取消；失败后文档处于什么状态；返回的是数据提交结果。

下面每一步都按这个判据验收。只把 `undo.track` 换成另一个函数、而调用方仍自己开事务和拼装步骤，这一步不算完成。

不为此新建命令总线、注册中心或事件总线。不改名、不搬目录、不重写渲染和 Yjs。默认值仍用 `DocCreator`，结构仍用 `DocMutator`，几何规则仍用 `designGeomFieldMap` 的 `supports / read / apply`。历史机制仍用 `Undo`。

## 负责人与调用方

新增一个服务，注册到 `apps/web/src/editor/index.ts`：

```text
apps/web/src/editor/operation/edit-operation.ts
```

它属于当前 `Editor`。构造函数注入 `Session`、`YDoc`、`Undo`、`DocCreator`、`DocMutator`。不注入 `Select`。需要改选区时，由这次意图里的字段说明，函数内部再调用已经注入的选区能力。没有这个字段，选区保持不动。

|      | 负责人 `EditOperation`                 | 面板、快捷键、手势                              |
| ---- | -------------------------------------- | ----------------------------------------------- |
| 输入 | 节点 ID、父级 ID、字段值、手势阶段     | 从输入设备或当前选区算出这些值                  |
| 校验 | 目标存在、字段支持、数值合法、整批可做 | 不做文档校验                                    |
| 写入 | 调用已有创建、结构、几何规则           | 不调用 `yDoc.transact`、`DocMutator`、`setGeom` |
| 历史 | 决定这次意图记不记、记成哪一类         | 不调用 `undo.track`                             |
| 选区 | 只有意图写明时才改                     | 可以读取选区来填写 ID，不能让修改函数自己去读   |
| 结果 | 返回下面的 `EditResult`                | 用结果更新界面，不用再补一次历史                |

`EditResult` 至少包含：

```ts
type EditResult = {
  ok: boolean
  sessionId: string
  revision: number
  targetIds: string[]
  changed: boolean
  history: { recorded: boolean; canUndo: boolean; canRedo: boolean }
  errors: { code: string; message: string; targetId?: string; property?: string }[]
}
```

`ok === false` 时文档与调用前一致。`changed === false` 时不产生历史。`revision` 是本会话单调递增的文档变化次序，在 `YDoc.distribute` 收到非空 patch 时加一，`setup` 时从 0 开始。

`Undo.commit(type, description)` 在没有待归档 patch、也没有声明选区变化时直接返回，不入栈。`getPatches()` 仍只由这次提交消费。先加 `hasPendingPatches()`，避免提交前把 patch 取走。

## 1. 修改几何：把拆开的两步收成一次操作

这是现在最清楚的裂口：`DesignGeom.setGeom` 写文档，`view/editor/design/geom.tsx` 的 `useSetGeomValue` 再 `undo.track`。

### 1.1 意图

```ts
updateGeometry(input: {
  ids: string[]
  changes: Partial<Record<DesignGeomKey, number | boolean>>
}): EditResult
```

`DesignGeomKey` 就是 `workbench/design/geom/field-definitions.ts` 里的字段：`x`、`y`、`width`、`height`、`rotation`、`radius`、`flip`、`aspectRatio`，以及椭圆已有的角度字段。

坐标沿用这些字段的现有含义：相对父级的本地 `MRect`，不是场景坐标。

### 1.2 负责人内部

1. 在 `transact` 之前检查全部 ID 和字段。任一 ID 不存在、任一字段对该变体 `supports` 为 false、任一数字不是有限数，整批返回错误，不写。
2. 通过后一次 `transact`，对每个节点调用现有 `field.apply`。值与当前相同则跳过该字段。
3. 有写入才 `commit('state', ...)`。函数不读取 `Select`，不改选区。
4. 返回实际写过的 ID、修订号和历史状态。

`DesignGeom.setGeom` 留作字段应用。面板不再直接调用它来完成一次用户修改。

### 1.3 面板变成调用方

文件：`view/editor/design/geom.tsx`。

1. `useSetGeomValue` 读取当前选中节点的 ID，调用 `updateGeometry`，删掉 `undo.track`。
2. 锁定宽高比、单选翻转，同样只传 ID 和字段。
3. 多选翻转仍由 `StageTransformer.flip` 计算，计算结束后把结果交给同一次几何提交。组件里的 `undo.track` 删掉。
4. 旋转 90° 是在当前值上加 90。意图里写增量后的绝对角度，或单独传增量。不要把 `rotation` 直接写成 90。
5. 数字滑条的 `beforeSlide` / `onSlide` 先保持 `setupSlideGeom`。第 3 节再把这段收进手势边界。`onEnd` 若已经滑过，只提交这一次，不再 `setGeom` 一遍。

### 1.4 验收

不打开面板，对节点 B 调用 `updateGeometry`，选区停在 A。B 的几何变了，历史一条，选区仍是 A。撤销回到修改前。

再从面板改一个 rect 的 `x`。`geom.tsx` 里不再出现 `undo.track` 和 `setGeom`。历史仍是一条，撤销后位置和选区都正确。

对 text 传 `radius`，或传入不存在的 ID。修订号不变，栈长度不变，`errors` 里有对应项。

## 2. 创建：手势只提供矩形，操作负责落地

这是另一处裂口。`stage/interact/create.ts` 现在同时做父级判断、`DocCreator`、`addNodes`、`insertChildAt`、选中和 `undo.track('all')`。

手势继续负责把拖动换成父级 ID 和本地矩形。按下、移动、松开的坐标换算、吸附和对父级矩阵求逆，留在 `StageCreate`。

### 2.1 两种入口，同一套落地规则

一次性创建：

```ts
createNodes(input: {
  parentId: string
  index?: number
  nodes: Array<{
    variant: 'frame' | 'rect' | 'text'
    x?: number
    y?: number
    width?: number
    height?: number
    content?: string
  }>
  selectCreated?: boolean
}): EditResult
```

`selectCreated` 缺省为 false。底层创建不偷偷改选区。画布创建把 `selectCreated: true` 传进来，负责人才在同一次历史里选中新节点，历史类型用 `'all'`。

连续创建使用另一组方法，复用上面的创建和几何规则，提交次数不同：

```ts
beginCreate(input): EditResult   // 创建初始节点，不 commit
updateCreate(input): EditResult  // 按拖动结果改几何，不 commit
commitCreate(input): EditResult  // 有变化才 commit 一次
cancelCreate(input): EditResult  // 去掉 begin 以来的节点，不留历史
```

`beginCreate` 返回的 `targetIds` 是后续 update、commit、cancel 的目标。这四个方法不要收成 `createNodes` 一个函数。

### 2.2 负责人内部

1. 预检父级存在且有 `childIds`，变体只收 `frame | rect | text`，数字有限，宽高大于等于 0。失败则不写。
2. 用 `DocCreator.frame / rect / text` 生成完整节点，用 `DocMutator.addNodes` 和 `insertChildAt` 挂上。
3. `createNodes` 在同一次事务后按 `selectCreated` 决定 `'state'` 或 `'all'`。
4. `beginCreate` 和 `updateCreate` 不 `commit`。`commitCreate` 看有没有净变化。`cancelCreate` 删除这次创建的节点；删除本身抵消创建，所以不入栈。
5. 第一阶段不做 ellipse、line。`StageCreate` 里这两种的拖动计算先留在原地，等同一套边界就绪后再接。

### 2.3 手势变成调用方

`StageCreate` 的 `onCreateStart` 调用 `beginCreate`。`onCreateMove` 调用 `updateCreate`。`onCreateEnd` 调用 `commitCreate`。

文件里不再出现 `docMutator`、`undo.track`、`selectAction.onCreateSelect`。父级仍由现在的 `findParent()` 算好后放进意图。

### 2.4 验收

不经过鼠标，依次调用 begin、update、commit。得到节点 ID、一条历史。`selectCreated: true` 时选区是新节点，撤销同时恢复节点和选区。`selectCreated` 缺省时选区不动。

再在画布上拖一个 rect。松开前栈长度不变。松开后一条历史。撤销后节点和选区一起回去。点击而没有拖动时，仍得到默认尺寸，并且只有这一条历史。

`create.ts` 里已经没有事务、历史和选中调用。

## 3. 连续修改使用操作边界

移动、缩放、旋转、数字滑条、取色器拖动，都是同一件事：过程中反复写文档，结束时归档一次，取消时回到起点。

手势继续计算位移、缩放比、角度和颜色。负责人提供边界：

```ts
beginEdit(input: { ids: string[] }): EditResult
applyEdit(input: { ids: string[]; changes: ... }): EditResult
commitEdit(input: { description: string }): EditResult
cancelEdit(): EditResult
```

`applyEdit` 内部走第 1 节的字段规则，但不 `commit`。`commitEdit` 只在有净变化时归档。`cancelEdit` 把 begin 时的值写回去；写回去之后没有净变化，则不归档。

不要让每一帧调用 `updateGeometry`。那个函数每次都会形成一条历史。

接入时，这些文件只保留计算，把开始、写入、结束改成上面四个方法：

- `DesignGeom.setupSlideGeom` 与 `geom.tsx` 的 `beforeSlide` / `onSlide` / `onEnd`
- `stage/transformer.ts` 的 move、resize、rotate。`onDestroy` 里现有的一次归档改由 `commitEdit` 发生。`moved === false` 时不提交。
- `altCopy` 和 `moveNodesInOrOutFrame` 产生的文档变化留在同一次 `commitEdit` 里，它们自己不归档。
- 取色器和描边虚线的 `onSlide` 只 `applyEdit`，`onEnd` 才 `commitEdit`。

验收：拖动一个节点，松开前栈不变，松开后一条，撤销回到按下前。按住 Alt 复制并拖动，仍是一条历史。滑条同理。

## 4. 其余操作去掉隐式选区

做到这里，负责人才算接到了架构里点名的两类操作。剩下的操作按同一标准搬：意图里带 ID，函数体不读 `Select`，调用方删掉自己的事务和 `undo.track`。

调用方可以从 `Select` 取出当前 ID 再传进来。这是选区作为目标来源。修改函数自己调用 `getSelectedNodes()` 则是隐式目标，要去掉。

| 操作           | 现在的负责人                      | 意图里要显式给出                    | 历史                                |
| -------------- | --------------------------------- | ----------------------------------- | ----------------------------------- |
| 纯色与填充增删 | `DesignFill` 内部读选区           | 节点 ID、fill 下标、颜色或增删      | 拖动用第 3 节；增删用一次 `'state'` |
| 描边           | `DesignStroke` 内部读选区         | 节点 ID 和要改的描边字段            | 同填充                              |
| 重命名         | `NodeAction.renameNode`           | 节点 ID、名称                       | `'state'`                           |
| 删除           | `deleteSelectedNodes`             | 节点 ID 列表                        | `'all'`，因为同时清空选区           |
| 粘贴           | `pasteNodes`                      | 已复制的源 ID、目标父级             | `'all'`，因为同时替换选区           |
| 层级           | `reHierarchySelectedNode`         | 节点 ID、`up / down / top / bottom` | 保持现在的 `'all'`                  |
| 包进 frame     | `wrapInFrame`                     | 节点 ID。先检查它们同父级           | `'all'`                             |
| 对齐           | `DesignAlign.setAlign` 内部读选区 | 节点 ID、对齐方式                   | 没有位移则不归档                    |
| 页面增删       | `PageAction`                      | 页面 ID 或新建页面                  | `'all'`                             |
| 选择           | `SelectAction`、框选、图层面板    | 这是选区操作，目标就是选区          | `'client'`。不改文档                |

`Command` 只保留快捷键和菜单，回调改成取 ID 后调用上表的方法。`Command` 不归档。

开发快照 `header/dev-snapshot.tsx` 按记录重放栈，继续直接调用 `undo.track`。

每搬完一个操作就做两步验收：直接用 ID 调用，当前选区可以停在别的节点上；再用原来的按钮或快捷键做一次，历史条数和撤销结果与搬之前一致。调用文件里不再出现这次操作的 `transact` 和 `undo.track`。

## 5. 负责人绑定这一次编辑会话

操作层已经挂在 `Editor` 上，读写的是这个实例的 `YDoc`。接着去掉还能绕开它的两条路。

1. 新操作内部不调用 `docGetter`、`findNode`、`findPage`、`findGraph`。父级和节点从这次注入的 `yDoc.doc` 读。
2. `DocMutator`、`DocHelper`、`Select.getSelectedNodes`、渲染树和图层，改为接收这次文档或 `getDoc`。`createGraphTraverse` 的调用都传入 `getDoc`。
3. 编辑器代码不再调用 `setupDocGetter` 之后，删除 `editor/doc/getter.ts`。在那之前保留它，渲染还依赖现有查找。
4. `FileAction` 挂在 `Global` 上，却会构造出另一套 `YDoc`、`Undo`、`Select`。文件创建只生成初始 `S.Doc` 并写入该文件 ID 的本地存储，用完销毁临时 `Y.Doc`。打开文件、`undo.setup`、选中首页只留在 `Session.setupFile`。

验收：同一个编辑器里修改后撤销，走的是这个 `Editor` 的历史。`Global` 不再因为文件操作持有一套选区和撤销。

## 6. 外部调用方

适配层和面板使用同一组方法：`updateGeometry`、`createNodes`、连续创建、连续修改，以及第 4 节已经搬完的操作。

适配层把参数转成意图，把 `EditResult` 转成对外结果。它不 import `YDoc`、`DocMutator`、`DocCreator`。调用方持有的 `sessionId` 与当前会话不一致时返回错误，不写入。

返回值表示文档提交。它不表示画布已经画完。

## 卡住时

- 一个步骤如果做完后，原来的调用方仍要知道“这次要不要自己记历史”，负责人还没有立住。
- 需要默认节点时补 `DocCreator`。需要改父子或矩阵存储时补 `DocMutator` 或现有 `field.apply`。
- 手势算法、吸附、命中测试留在 `Stage*`。它们算出的是意图里的数字和 ID。
- 椭圆、直线、路径、图片、阴影，等对应操作也按第 4 节的标准搬。不要先加进一个没有调用方的大 `changes`。
