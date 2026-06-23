# 07 · Yjs 协同机制

Sigma 支持多人实时协同：多人同时编辑同一个文件，看到彼此的光标和选择，改动实时同步。这一篇讲清楚协同是怎么实现的。

---

## 协同的两个层次

协同数据分成两类，用不同机制同步：

```
┌─────────────────────────────────────────────┐
│  ① 文档数据（Schema）                          │
│     节点、属性、层级……                          │
│     用 Yjs CRDT（Y.Doc）同步                   │
│     → 持久化、可合并、进 undo 历史               │
├─────────────────────────────────────────────┤
│  ② 临时状态（Client）                          │
│     光标位置、当前选中、视口……                   │
│     用 Yjs Awareness 同步                      │
│     → 轻量、不进历史、断线即清                   │
└─────────────────────────────────────────────┘
```

对应代码：

| 层次     | 服务               | 同步机制                                |
| -------- | ------------------ | --------------------------------------- |
| 文档数据 | `YState` + `Immut` | `Y.Doc` 的 `Y.Map` + `observeDeep`      |
| 临时状态 | `YClients`         | `YSync.awareness`（来自 `y-protocols`） |

---

## YState 的双层状态模型（核心）

这是整个协同系统最精妙也最容易踩坑的地方。`YState` 同时维护**两层状态**：

```
┌──────────────────────────────────────────────┐
│  Y.Doc（CRDT 权威源）                           │
│    doc.getMap('schema')                        │
│    → 多人编辑时自动合并                          │
│    → 通过 WebSocket 广播                        │
│    → 持久化到 IndexedDB                         │
└─────────────────┬────────────────────────────┘
                  │  observeDeep（subscribeY）
                  ▼
┌──────────────────────────────────────────────┐
│  Immut（本地镜像）                              │
│    immut.state（普通对象）                      │
│    → 渲染层订阅它                               │
│    → 产生 ImmutPatch 驱动重绘                   │
└──────────────────────────────────────────────┘
```

### 为什么要两层

- **Y.Doc 是 CRDT**，结构特殊（Y.Map / Y.Array），不能直接拿来渲染，且读取要走 transaction。
- **渲染层（Scene / React）需要的是普通可订阅对象**，MobX / Signal 才能响应。
- 所以维护一个 Immut 镜像，渲染层只看 Immut，Y.Doc 只管协同合并。

### 双向绑定：`bind()`

`utils/immut/immut-y.ts` 的 `bind(immut, yMap)` 建立双向同步：

```ts
export function bind(i: Immut, y: Y.Map<any>) {
  initializeIFromY(i, y) // ① Y → Immut：用 Y 数据初始化 Immut
  initializeYFromI(i, y) // ② Immut → Y：用 Immut 数据初始化 Y（首次）
  const unsubscribeY = subscribeY(y, i) // ③ Y → Immut：订阅 Y 变更，投影回 Immut
  return () => {
    unsubscribeY()
  }
}
```

涉及三个文件：

- `json-to-y.ts`：把普通对象 / Immut 转成 Y.Map/Y.Array 结构
- `y-to-immut.ts`：把 Y 结构转回普通对象，以及 `subscribeY`（监听 Y 变更投影到 Immut）
- `immut-y.ts`：组合两者的 `bind` 入口

### 写入语义（重要）

`YState.set` 的写入规则（[04-data-flow.md](./04-data-flow.md) 也讲过，这里强调）：

```ts
set(keyPath, value) {
  if (this.doc) this.setYValue(keyPath, value)    // ① 总是写 Y.Doc
  if (!this.doc || this.transactionDepth > 0) {
    this.immut.set(keyPath, value)                // ② 特定条件下也立即写 Immut
  }
}
```

三种场景：

| 场景             | 写 Y.Doc | 写 Immut | Immut 最终如何更新       |
| ---------------- | -------- | -------- | ------------------------ |
| 没有 doc（离线） | ❌       | ✅ 立即  | 直接                     |
| 有 doc，平时     | ✅       | ❌       | 由 observer 回投         |
| 有 doc，事务内   | ✅       | ✅ 立即  | 立即 + observer 幂等兜底 |

**事务内立即同步 Immut 的原因**：保证同一事务里后续代码读 `YState.state` 是新值（父子关系刚写入，后续不能读到旧 childIds）。

**observer 不能关的原因**：它还承担「远端协同变更投影」「非事务写入的统一投影」职责，只是对本地事务做幂等判断避免重复写。

> 📝 这个语义非常微妙，完整论证见 [`ai/notes/y-state-mirror-sync.md`](../notes/y-state-mirror-sync.md)。**改 YState 相关代码前必读**。

### 幂等性是这套机制的基石

因为事务内「先写本地」+「observer 也会触发」，observer 侧必须做幂等判断，否则会双写（之前数组 insert 导致重复 childIds 的 bug 就是这么来的）：

- map set 前比较新旧值，相同就跳过
- array 事件前比较整个数组，相同就跳过
- delete 前看本地值是否还在

---

## YSync：WebSocket 连接

`editor/y-state/y-sync.ts`：

```ts
class YSyncService {
  provider!: HocuspocusProvider
  awareness!: Awareness

  init(fileId: string, document: Y.Doc) {
    this.provider = new HocuspocusProvider({
      url: 'wss://api.gitborlando.com', // 后端 Hocuspocus server
      name: fileId, // 文件 id 作为 room
      document, // 共享同一个 Y.Doc
    })
    this.awareness = this.provider.awareness!
    return Disposer.combine(YClients.syncSelf(), YClients.syncOthers())
  }
}
```

- **Hocuspocus** 是 Yjs 的官方 WebSocket 服务端实现。Sigma 的后端跑了一个 Hocuspocus server（`api.gitborlando.com`），负责中转 Yjs 更新。
- 每个文件是一个 room（用 fileId 标识），同一 room 的人共享同一个 Y.Doc。
- `awareness` 是 Yjs 协议里的「在场状态」机制，专门用于同步临时数据。

> 注意：当前 `YState.initSchema` 里 `YSync.init` 那行被注释掉了（`// YSync.init(fileId, this.doc)`），意味着**协同默认未开启**，走的是本地 IndexedDB 持久化。需要协同时取消注释即可。这也是单人开发阶段的合理状态。

---

## YClients：在场状态

`editor/y-state/y-clients.ts` 管理所有协同用户的状态：

```ts
class YClientsService {
  clientId!: number
  @observable client: S.Client = {...}    // 自己的状态
  @observable others: S.Clients = {}      // 其他人的状态
  @observable observingClientId?: number   // 正在「跟随视角」的用户
}
```

### syncSelf：把本地状态广播出去

监听本地的选择、鼠标移动、视口变化，写入 awareness：

```ts
reaction(
  () => ({ selectIdMap, selectPageId }),
  () => this.syncSelectState(), // 选择变了 → 广播
)
this.onMouseMove() // 鼠标动 → 广播光标
```

awareness 的写入是 `YSync.awareness.setLocalState(clientState)`。

### syncOthers：接收他人状态

监听 awareness 变化，更新 `this.others`：

```ts
awareness.on('change', ({ added, updated, removed }) => {
  // added/updated → 从 awareness.getStates() 读出来放到 this.others
  // removed → 从 this.others 删除
})
```

`this.others` 是 MobX observable，UI 订阅它来显示他人光标、他人选中的描边。

### 跟随视角（observe）

`observingClientId` 表示「我正在跟随某个用户的视角」。设置后：

- `CooperateObservingBorderComp` 显示一个彩色边框
- 视口会同步到该用户的 `sceneMatrix`

这是 Figma 也有「follow」功能的实现。

---

## 持久化：IndexedDB

`y-indexeddb` 提供离线持久化。Y.Doc 会自动同步到浏览器的 IndexedDB，下次打开同一文件时即使断网也能加载。

加载流程（`YState.initSchema`）当前是从云端 zip 包读取（Supabase + COS）：

```
fileId
  │
  ▼
FileService.getFileMeta(fileId)        ← Supabase 查文件元信息（含下载 url）
  │
  ▼
FileService.loadFile(url)              ← 从 COS 下载 zip
  │
  ▼
jsZip.loadAsync → 解压出 .json
  │
  ▼
migrationSchema(json)                  ← 迁移到最新版本
  │
  ▼
new Y.Doc() + bind(immut, yMap)        ← 建立双层状态
  │
  ▼
Undo.initUndo(...)                     ← 初始化撤销
  │
  ▼
inited$.dispatch(true)                 ← 通知所有订阅者：数据就绪
```

---

## 撤销重做与协同的关系

`Undo`（`editor/core/undo.ts`）结合了两个系统：

```ts
initUndo({ stateMap, getPatches }) {
  YUndo = new Y.UndoManager(stateMap)   // Yjs 的 undo manager
}
```

- **文档数据的 undo**：用 `Y.UndoManager`（Yjs 原生，协同友好，能正确处理多人 undo）
- **客户端状态的 undo**：用 `MobxUndo`（选择、页面切换，不需要协同）

`Undo.track(type, description)` 把一次操作的 state patches 和 client state 打包成一个 entry。undo/redo 时同时回放两者。

关键：**undo 也是一次数据写入**，走和正常编辑相同的数据流（改 Y.Doc → 协同广播 → observer → Immut → Scene → Surface）。所以 A 用户 undo，B 用户也会看到回退。

---

## 协同数据流总览

把所有协同组件串起来，一次「A 改颜色，B 看到」的完整流程：

```
A 用户改颜色
  │
  ▼
YState.set() 写入 A 的 Y.Doc
  │
  ├──→ A 的 Immut 更新 → A 的 Scene → A 的 Surface 重绘（A 自己看到）
  │
  ▼
A 的 HocuspocusProvider 把 Yjs update 通过 WebSocket 发给 server
  │
  ▼
Server 转发给同 room 的 B
  │
  ▼
B 的 HocuspocusProvider 收到 → 应用到 B 的 Y.Doc
  │
  ▼
B 的 Y.Doc observeDeep 触发 → subscribeY → B 的 Immut 更新
  │
  ▼
B 的 Scene → Surface 重绘（B 看到 A 的改动）
```

光标同步走 awareness，类似但更轻：

```
A 鼠标移动 → awareness.setLocalState({cursor})
  → server 转发 → B 的 awareness change 事件
  → B 的 YClients.others[A].cursor 更新
  → B 的 EditorStageCursorsComp 重绘（A 的光标在 B 屏幕上移动）
```

---

## 当前协同状态说明

需要诚实说明：**当前主分支协同是关闭状态**。

- `YState.initSchema` 里 `YSync.init` 被注释掉了
- 应用走的是「单机 + 云端 zip 存取 + IndexedDB 本地缓存」模式
- 但**整套协同基础设施是完整的**（Y.Doc 双层绑定、awareness、Hocuspocus provider、跟随视角、undo 整合），随时取消注释即可启用

这是因为作者当前是单人使用，协同的实际需求暂时不强。代码里保留完整协同能力是为了未来需要时能直接打开，也方便读者学习协同实现。

---

## 下一站

→ [`08-ui-and-interact.md`](./08-ui-and-interact.md) 看 UI 层和交互系统。
